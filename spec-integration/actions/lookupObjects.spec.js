const { expect } = require('chai');
const lookupObjects = require('../../lib/actions/lookupObjects');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('lookupObjects', () => {
  it('looks up Contact Objects', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
      termNumber: 1,
      outputMethod: 'emitIndividually',
    };
    const msg = {
      body: {
        sTerm_1: {
          fieldName: 'extID',
          condition: '=',
          fieldValue: 'stas2j3z4dittdc79cfe71akit',
        },
      },
    };

    const context = getContext();
    await lookupObjects.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(1);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.results[0].attributes.type).to.eql(testCfg.sobject);
  });
});
