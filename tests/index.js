const Buffer = require('safe-buffer').Buffer
const tape = require('tape')
const cbor = require('borc')
const objects = require('../')

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
