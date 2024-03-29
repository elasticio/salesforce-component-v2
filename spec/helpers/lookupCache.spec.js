const { expect } = require('chai');

process.env.HASH_LIMIT_TIME = 1000;
const { lookupCache } = require('../../lib/helpers/lookupCache.js');

describe('Lookup Cache unit tests', () => {
  describe('Lookup Cache class unit tests', () => {
    before(() => {
      lookupCache.clear();
    });

    beforeEach(() => {
      lookupCache.enableCache();
    });

    afterEach(() => {
      lookupCache.clear();
    });

    it('getMap', async () => {
      const map = lookupCache.getMap();
      expect(map).to.equal(lookupCache.requestCache);
    });

    it('hasKey', async () => {
      const map = lookupCache.getMap();

      map.set('a', { letter: 'a' });
      map.set('b', { letter: 'b' });
      map.set('c', { letter: 'c' });

      expect(lookupCache.hasKey('a')).to.equal(true);
      expect(lookupCache.hasKey('b')).to.equal(true);
      expect(lookupCache.hasKey('c')).to.equal(true);
      expect(lookupCache.hasKey('d')).to.equal(false);
    });

    it('addRequestResponsePair', async () => {
      lookupCache.addRequestResponsePair('a', { letter: 'a' });
      lookupCache.addRequestResponsePair('b', { letter: 'b' });
      lookupCache.addRequestResponsePair('c', { letter: 'c' });

      const map = lookupCache.getMap();

      expect(map.zeroNode.nextNode.key).to.equal('c');
      expect(map.zeroNode.nextNode.value.letter).to.equal('c');
      expect(map.zeroNode.nextNode.nextNode.key).to.equal('b');
      expect(map.zeroNode.nextNode.nextNode.value.letter).to.equal('b');
      expect(map.zeroNode.nextNode.nextNode.nextNode.key).to.equal('a');
      expect(map.zeroNode.nextNode.nextNode.nextNode.value.letter).to.equal('a');
      expect(map.size).to.equal(3);
    });

    it('addRequestResponsePair limit check', async () => {
      lookupCache.addRequestResponsePair('a', { letter: 'a' });
      lookupCache.addRequestResponsePair('b', { letter: 'b' });
      lookupCache.addRequestResponsePair('c', { letter: 'c' });
      lookupCache.addRequestResponsePair('d', { letter: 'd' });
      lookupCache.addRequestResponsePair('e', { letter: 'e' });
      lookupCache.addRequestResponsePair('f', { letter: 'f' });
      lookupCache.addRequestResponsePair('g', { letter: 'g' });
      lookupCache.addRequestResponsePair('h', { letter: 'h' });
      lookupCache.addRequestResponsePair('i', { letter: 'i' });
      lookupCache.addRequestResponsePair('j', { letter: 'j' });
      lookupCache.addRequestResponsePair('k', { letter: 'k' });
      lookupCache.addRequestResponsePair('l', { letter: 'l' });

      const map = lookupCache.getMap();
      expect(map.size).to.equal(10);
      expect(map.zeroNode.nextNode.key).to.equal('l');
      expect(map.zeroNode.nextNode.value.letter).to.equal('l');

      expect(lookupCache.hasKey('a')).to.equal(false);
      expect(lookupCache.hasKey('b')).to.equal(false);
      expect(lookupCache.hasKey('c')).to.equal(true);
      expect(lookupCache.hasKey('d')).to.equal(true);
    });

    it('getResponse', async () => {
      lookupCache.addRequestResponsePair('a', { letter: 'a' });
      lookupCache.addRequestResponsePair('b', { letter: 'b' });
      lookupCache.addRequestResponsePair('c', { letter: 'c' });

      const result = lookupCache.getResponse('b');

      expect(result).to.deep.equal({ letter: 'b' });

      const map = lookupCache.getMap();
      expect(map.zeroNode.nextNode.key).to.equal('b');
      expect(map.zeroNode.nextNode.value.letter).to.equal('b');
      expect(map.zeroNode.nextNode.nextNode.key).to.equal('c');
      expect(map.zeroNode.nextNode.nextNode.value.letter).to.equal('c');
      expect(map.zeroNode.nextNode.nextNode.nextNode.key).to.equal('a');
      expect(map.zeroNode.nextNode.nextNode.nextNode.value.letter).to.equal('a');
      expect(map.size).to.equal(3);
    });

    it('clear', async () => {
      lookupCache.addRequestResponsePair('a', { letter: 'a' });
      lookupCache.addRequestResponsePair('b', { letter: 'b' });
      lookupCache.addRequestResponsePair('c', { letter: 'c' });

      lookupCache.clear();

      expect(lookupCache.getResponse('a')).to.equal(undefined);
      expect(lookupCache.getResponse('b')).to.equal(undefined);
      expect(lookupCache.getResponse('c')).to.equal(undefined);
      expect(lookupCache.getMap().size).to.equal(0);
    });

    it('generateKeyFromDataArray', async () => {
      const result = lookupCache.generateKeyFromDataArray('a', 1, -5, true, ['1', 'a', 5]);
      expect(result).to.equal('a1-5true1,a,5');
    });
  });

  describe('Linked Limited Map class unit tests', () => {
    before(() => {
      lookupCache.clear();
    });

    afterEach(() => {
      lookupCache.clear();
    });

    it('delete', async () => {
      const map = lookupCache.getMap();

      map.set('a', { letter: 'a' });
      map.set('b', { letter: 'b' });
      map.set('c', { letter: 'c' });

      map.delete('b');

      expect(map.zeroNode.nextNode.key).to.equal('c');
      expect(map.zeroNode.nextNode.value.letter).to.equal('c');
      expect(map.zeroNode.nextNode.nextNode.key).to.equal('a');
      expect(map.zeroNode.nextNode.nextNode.value.letter).to.equal('a');
      expect(map.size).to.equal(2);

      map.delete('c');

      expect(map.zeroNode.nextNode.key).to.equal('a');
      expect(map.zeroNode.nextNode.value.letter).to.equal('a');

      expect(map.size).to.equal(1);
    });
  });
});
