const Buffer = require('safe-buffer').Buffer
const tape = require('tape')
const cbor = require('borc')
const objects = require('../')
const utils = require('../utils')

tape('system objects', t => {
  t.equals(objects.getType(), 'invalid')
  t.equals(objects.getType(true), 'invalid')
  const msg = new objects.Message({
    ticks: 100
  })

  t.equals(objects.getType(msg), 'message')
  t.equals(msg.ticks, 100)
  msg.ticks = 10
  t.equals(msg.ticks, 10)

  const id = new objects.ID(Buffer.from([0x1]))
  const enid = cbor.encode(id)
  const rid = objects.decoder.decodeFirst(enid)
  t.equals(rid.toString(), '01')
  t.equals(objects.getType(id), 'id')

  const modRef = new objects.ModuleRef({'name': ['i32']}, id)
  const enmod = cbor.encode(modRef)
  const rmodRef = objects.decoder.decodeFirst(enmod)
  t.equals(objects.getType(modRef), 'mod')
  t.deepEquals(modRef, rmodRef)

  const funcRef = rmodRef.getFuncRef('name')
  funcRef.gas = 1000
  const funcRef2 = funcRef.copy()
  funcRef2.gas = 500
  t.equals(funcRef.gas, 1000, 'should have correct gas amount')
  const enFuncRef = cbor.encode(funcRef)
  const rFuncRef = objects.decoder.decodeFirst(enFuncRef)
  t.deepEquals(funcRef, rFuncRef)
  t.equals(objects.getType(rFuncRef), 'func')

  const link = new cbor.Tagged(42, 'data')
  const enLink = cbor.encode(link)
  const rLink = objects.decoder.decodeFirst(enLink)
  t.deepEquals(rLink, {'/': 'data'})
  t.equals(objects.getType(rLink), 'link')

  t.equals(objects.getType([]), 'elem')
  t.equals(objects.getType(Buffer.from([])), 'data')

  t.end()
})

tape('actor IDs', t => {
  const id0 = { nonce: 0, parent: null }
  const hashedId0 = objects.generateActorId(id0)
  t.deepEquals(hashedId0.id, Buffer.from('372a08b828598122fc64c4aa94735c770f25bbbc', 'hex'))

  const id00 = { nonce: 0, parent: hashedId0 }
  const hashedId00 = objects.generateActorId(id00)
  t.deepEquals(hashedId00.id, Buffer.from('10d7d4be8663c37d8ea7cff89b7c01c059ebbc80', 'hex'))

  const id01 = { nonce: 1, parent: hashedId0 }
  const hashedId01 = objects.generateActorId(id01)
  t.deepEquals(hashedId01.id, Buffer.from('0ca311b75efd27e7daf6eec8b51b5c1fe33ff233', 'hex'))

  t.end()
})

tape('utils', t => {
  const id = new objects.ID(Buffer.from([0x1]))
  const obj = [
    new objects.ModuleRef({'name': ['i32']}, id),
    new objects.FunctionRef({
      identifier: [false, 'main'],
      actorID: id,
      params: ['i32'],
      gas: 100
    }),
    Buffer.from([1, 2, 3, 4])
  ]
  const jsonFull = utils.toJSON(obj)
  t.deepEquals(JSON.stringify(jsonFull), '[{"@ModuleRef":{"id":"0x01","exports":{"name":["i32"]}}},{"@FunctionRef":{"actorID":"0x01","private":false,"name":"main","gas":100,"params":["i32"]}},"0x01020304"]')

  const json = utils.toJSON(obj, false)
  t.deepEquals(JSON.stringify(json), '[{"@ModuleRef":{"id":"0x01"}},{"@FunctionRef":{"actorID":"0x01","private":false,"name":"main","gas":100}},"0x01020304"]')

  const newObj = [
    new objects.ModuleRef(undefined, id),
    new objects.FunctionRef({
      identifier: [false, 'main'],
      actorID: id,
      gas: 100
    }),
    Buffer.from([1, 2, 3, 4])
  ]
  t.deepEquals(utils.fromJSON(json), newObj)

  t.deepEquals(utils.fromJSON(jsonFull), obj)

  const hashedId01 = utils.actorRefToId([0, 1])
  t.deepEquals(hashedId01.id, Buffer.from('0ca311b75efd27e7daf6eec8b51b5c1fe33ff233', 'hex'))

  t.end()
})
