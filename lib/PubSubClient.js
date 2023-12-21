/* eslint-disable no-param-reassign, no-nested-ternary, no-undef */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const certifi = require('certifi');
const avro = require('avro-js');
const { EventEmitter } = require('events');
const fs = require('fs').promises;

const DEFAULT_PUBSUB_API_ENDPOINT = 'api.pubsub.salesforce.com:7443';
const CUSTOM_LONG_AVRO_TYPE = avro.types.LongType.using({
  fromBuffer: (buf) => {
    const big = buf.readBigInt64LE();
    if (big < Number.MIN_SAFE_INTEGER || big > Number.MAX_SAFE_INTEGER) {
      return big;
    }
    return Number(BigInt.asIntN(64, big));
  },
  toBuffer: (n) => {
    const buf = Buffer.allocUnsafe(8);
    if (n instanceof BigInt) {
      buf.writeBigInt64LE(n);
    } else {
      buf.writeBigInt64LE(BigInt(n));
    }
    return buf;
  },
  fromJSON: BigInt,
  toJSON: Number,
  isValid: (n) => {
    const type = typeof n;
    return (type === 'number' && n % 1 === 0) || type === 'bigint';
  },
  compare: (n1, n2) => (n1 === n2 ? 0 : n1 < n2 ? -1 : 1),
});

class PubSubClient {
  logger;

  cfg;

  topicName;

  client;

  schema;

  lastKeepAlive;

  subscription;

  eventEmitter;

  constructor(logger, cfg) {
    this.logger = logger;
    this.cfg = cfg;
    this.topicName = `/event/${this.cfg.object}`;
  }

  async connect(accessToken, instanceUrl) {
    const rootCert = await fs.readFile(certifi);
    const tenantId = accessToken.split('!')[0];
    const packageDefinition = await protoLoader.load(`${__dirname}/helpers/pubsub_api.proto`);
    const grpcObj = grpc.loadPackageDefinition(packageDefinition);
    const sfdcPackage = grpcObj.eventbus.v1;
    const metaCallback = (_params, callback) => {
      const meta = new grpc.Metadata();
      meta.add('accesstoken', accessToken);
      meta.add('instanceurl', instanceUrl);
      meta.add('tenantid', tenantId);
      callback(null, meta);
    };
    const callCreds = grpc.credentials.createFromMetadataGenerator(metaCallback);
    const combCreds = grpc.credentials.combineChannelCredentials(grpc.credentials.createSsl(rootCert), callCreds);
    this.client = new sfdcPackage.PubSub(
      this.cfg.pubsubEndpoint || DEFAULT_PUBSUB_API_ENDPOINT,
      combCreds,
    );
    this.logger.info('Connected to Pub/Sub API endpoint');
    try {
      await this.loadSchema();
      this.logger.info('Schema loaded');
    } catch (err) {
      throw new Error(`Failed to load schema: ${err.message}`);
    }
  }

  setLogger(logger) { this.logger = logger; }

  async loadSchema() {
    if (this.schema) return;
    this.schema = await new Promise((resolve, reject) => {
      this.client.GetTopic({ topicName: this.topicName }, (topicError, response) => {
        if (topicError) {
          reject(topicError);
        } else {
          const { schemaId } = response;
          this.client.GetSchema({ schemaId }, (schemaError, res) => {
            if (schemaError) {
              reject(schemaError);
            } else {
              const schemaType = avro.parse(res.schemaJson, { registry: { long: CUSTOM_LONG_AVRO_TYPE } });
              resolve({
                id: schemaId,
                type: schemaType,
              });
            }
          });
        }
      });
    });
  }

  flattenSinglePropertyObjects(theObject) {
    Object.entries(theObject).forEach(([key, value]) => {
      if (key !== 'ChangeEventHeader' && value && typeof value === 'object') {
        const subKeys = Object.keys(value);
        if (subKeys.length === 1) {
          const subValue = value[subKeys[0]];
          theObject[key] = subValue;
          if (subValue && typeof subValue === 'object') {
            this.flattenSinglePropertyObjects(theObject[key]);
          }
        }
      }
    });
  }

  async subscribe(numRequested, fromReplayId) {
    const eventEmitter = new EventEmitter();
    this.subscription = this.client.Subscribe();
    const writeOptions = { topicName: this.topicName, numRequested };

    if (fromReplayId) {
      const buf = Buffer.allocUnsafe(8);
      buf.writeBigUInt64BE(BigInt(fromReplayId), 0);
      writeOptions.replayPreset = 2;
      writeOptions.replayId = buf;
    }
    this.logger.info(`Requesting first ${numRequested} records`);
    this.subscription.write(writeOptions);

    this.subscription.on('data', (data) => {
      const latestReplayId = Number(data.latestReplayId.readBigUInt64BE());
      if (data.events) {
        for (const event of data.events) {
          const replayId = Number(event.replayId.readBigUInt64BE());
          const payload = this.schema.type.fromBuffer(event.event.payload);
          this.flattenSinglePropertyObjects(payload);
          eventEmitter.emit('data', { event: { replayId }, payload });
        }
        if (!data.pendingNumRequested) {
          this.logger.info(`requesting ${numRequested} more records`);
          this.subscription.write({ topicName: this.topicName, numRequested });
        }
      } else {
        this.logger.debug(`Received keepalive message. Latest replay ID: ${latestReplayId}`);
        data.latestReplayId = latestReplayId;
        this.lastKeepAlive = new Date().getTime();
        eventEmitter.emit('keepalive', data);
      }
    });
    this.subscription.on('end', () => {
      this.logger.warn('gRPC stream ended');
      eventEmitter.emit('end');
    });
    this.subscription.on('error', (error) => {
      this.logger.error(`gRPC stream error: ${JSON.stringify(error)}`);
      eventEmitter.emit('error', error);
    });
    this.subscription.on('status', (status) => {
      this.logger.warn(`gRPC stream status: ${JSON.stringify(status)}`);
      eventEmitter.emit('status', status);
    });
    this.eventEmitter = eventEmitter;

    return this.eventEmitter;
  }

  getLastKeepAlive() {
    return this.lastKeepAlive;
  }

  close() {
    try {
      this.eventEmitter.removeAllListeners();
      this.eventEmitter = null;
      this.subscription.removeAllListeners();
      this.subscription = null;
      this.client.close();
      this.client = null;
    // eslint-disable-next-line no-empty
    } catch (_e) {}
  }
}

module.exports.PubSubClient = PubSubClient;
