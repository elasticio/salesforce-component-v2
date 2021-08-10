/* eslint-disable no-return-assign */
const sinon = require('sinon');
const { messages } = require('elasticio-node');
const { expect } = require('chai');
const lookupObject = require('../../lib/actions/lookupObject');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const { getContext } = require('../../spec/common');

describe('lookupObject', () => {
  let msg;
  let lastCall;
  let configuration;

  beforeEach(async () => {
    lastCall.reset();
  });

  before(async () => {
    lastCall = sinon.stub(messages, 'newMessageWithBody')
      .returns(Promise.resolve());

    configuration = {
      apiVersion: SALESFORCE_API_VERSION,
      oauth: {
        undefined_params: {
          instance_url: process.env.INSTANCE_URL,
        },
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
      sobject: 'Contact',
      lookupField: 'Id',
      typeOfSearch: 'uniqueFields',
    };
    msg = {
      body: {
        Id: '00344000020qT3KAAU',
      },
    };
  });

  after(async () => {
    messages.newMessageWithBody.restore();
  });

  it('looks up Contact Object ', async () => {
    await lookupObject.process.call(getContext(), msg, configuration);
    expect(lastCall.lastCall.args[0].attributes.type).to.eql('Contact');
  });

  it('Contact Lookup fields ', async () => {
    const result = await lookupObject.getLookupFieldsModel.call(getContext(), configuration);
    expect(result).to.be.deep.eql({
      Demo_Email__c: 'Demo Email (Demo_Email__c)',
      Id: 'Contact ID (Id)',
      extID__c: 'extID (extID__c)',
    });
  });

  it('Contact linked objects ', async () => {
    const result = await lookupObject.getLinkedObjectsModel.call(getContext(), configuration);
    expect(result).to.be.deep.eql({
      Account: 'Account (Account)',
      CreatedBy: 'User (CreatedBy)',
      LastModifiedBy: 'User (LastModifiedBy)',
      Individual: 'Individual (Individual)',
      MasterRecord: 'Contact (MasterRecord)',
      Owner: 'User (Owner)',
      ReportsTo: 'Contact (ReportsTo)',
      '!AcceptedEventRelations': 'AcceptedEventRelation (AcceptedEventRelations)',
      '!AccountContactRoles': 'AccountContactRole (AccountContactRoles)',
      '!ActivityHistories': 'ActivityHistory (ActivityHistories)',
      '!Assets': 'Asset (Assets)',
      '!AttachedContentDocuments': 'AttachedContentDocument (AttachedContentDocuments)',
      '!Attachments': 'Attachment (Attachments)',
      '!CampaignMembers': 'CampaignMember (CampaignMembers)',
      '!CaseContactRoles': 'CaseContactRole (CaseContactRoles)',
      '!Cases': 'Case (Cases)',
      '!CombinedAttachments': 'CombinedAttachment (CombinedAttachments)',
      '!ContactRequests': 'ContactRequest (ContactRequests)',
      '!ContentDocumentLinks': 'ContentDocumentLink (ContentDocumentLinks)',
      '!ContractContactRoles': 'ContractContactRole (ContractContactRoles)',
      '!ContractsSigned': 'Contract (ContractsSigned)',
      '!DeclinedEventRelations': 'DeclinedEventRelation (DeclinedEventRelations)',
      '!Devices__r': 'Device__c (Devices__r)',
      '!DuplicateRecordItems': 'DuplicateRecordItem (DuplicateRecordItems)',
      '!EmailMessageRelations': 'EmailMessageRelation (EmailMessageRelations)',
      '!EmailStatuses': 'EmailStatus (EmailStatuses)',
      '!EventRelations': 'EventRelation (EventRelations)',
      '!Events': 'Event (Events)',
      '!FeedSubscriptionsForEntity': 'EntitySubscription (FeedSubscriptionsForEntity)',
      '!Feeds': 'ContactFeed (Feeds)',
      '!Histories': 'ContactHistory (Histories)',
      '!ListEmailIndividualRecipients': 'ListEmailIndividualRecipient (ListEmailIndividualRecipients)',
      '!Notes': 'Note (Notes)',
      '!NotesAndAttachments': 'NoteAndAttachment (NotesAndAttachments)',
      '!OpenActivities': 'OpenActivity (OpenActivities)',
      '!Opportunities': 'Opportunity (Opportunities)',
      '!OpportunityContactRoles': 'OpportunityContactRole (OpportunityContactRoles)',
      '!OutgoingEmailRelations': 'OutgoingEmailRelation (OutgoingEmailRelations)',
      '!PersonRecord': 'UserEmailPreferredPerson (PersonRecord)',
      '!ProcessInstances': 'ProcessInstance (ProcessInstances)',
      '!ProcessSteps': 'ProcessInstanceHistory (ProcessSteps)',
      '!RecordActionHistories': 'RecordActionHistory (RecordActionHistories)',
      '!RecordActions': 'RecordAction (RecordActions)',
      '!RecordAssociatedGroups': 'CollaborationGroupRecord (RecordAssociatedGroups)',
      '!Shares': 'ContactShare (Shares)',
      '!Tasks': 'Task (Tasks)',
      '!TopicAssignments': 'TopicAssignment (TopicAssignments)',
      '!UndecidedEventRelations': 'UndecidedEventRelation (UndecidedEventRelations)',
      '!Users': 'User (Users)',
      '!dsfs__DocuSign_Envelope01__r': 'dsfs__DocuSign_Envelope__c (dsfs__DocuSign_Envelope01__r)',
      '!dsfs__DocuSign_Envelope_Recipient__r': 'dsfs__DocuSign_Envelope_Recipient__c (dsfs__DocuSign_Envelope_Recipient__r)',
      '!dsfs__DocuSign_Status__r': 'dsfs__DocuSign_Status__c (dsfs__DocuSign_Status__r)',
      '!dsfs__R00NS0000000WUMyMAO__r': 'dsfs__DocuSign_Recipient_Status__c (dsfs__R00NS0000000WUMyMAO__r)',
    });
  });

  it('Contact objectTypes ', async () => {
    const result = await lookupObject.objectTypes.call(getContext(), configuration);
    expect(result.Account).to.be.eql('Account');
  });

  it('Contact Lookup Meta', async () => {
    const result = await lookupObject.getMetaModel.call(getContext(), configuration);
    expect(result.in).to.be.deep.eql({
      type: 'object',
      properties: {
        Id: {
          type: 'string',
          required: true,
          title: 'Contact ID',
          default: null,
        },
      },
    });
  });

  it('throws a special error when a binary field is queried as a linked object', async () => {
    try {
      await lookupObject.process.call(getContext(), msg,
        Object.assign(configuration, { linkedObjects: ['!Attachments'] }));
    } catch (e) {
      expect(e.message).to.equal('Binary fields cannot be selected in join queries');
    }
  });
});
