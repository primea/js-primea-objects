const tape = require('tape')
const cbor = require('borc')
const objects = require('../')

tape('system objects', t => {
  const msg = new objects.Message({
    ticks: 100
  })

  t.equals(msg.ticks, 100)
  msg.ticks = 10
  t.equals(msg.ticks, 10)

  const id = new objects.ID(Buffer.from([0x1]))
  const enid = cbor.encode(id)
  const rid = objects.decoder.decodeFirst(enid)
  t.equals(rid.toString(), '01')

  const modRef = new objects.ModuleRef({'name': ['i32']}, id)
  const enmod = cbor.encode(modRef)
  const rmodRef = objects.decoder.decodeFirst(enmod)
  t.deepEquals(modRef, rmodRef)

  const funcRef = rmodRef.getFuncRef('name')
  funcRef.gas = 1000
  const funcRef2 = funcRef.copy()
  funcRef2.gas = 500
  t.equals(funcRef.gas, 1000, 'should have correct gas amount')
  const enFuncRef = cbor.encode(funcRef)
  const rFuncRef = objects.decoder.decodeFirst(enFuncRef)
  t.deepEquals(funcRef, rFuncRef)

  const link = new cbor.Tagged(42, 'data')
  const enLink = cbor.encode(link)
  const rLink = objects.decoder.decodeFirst(enLink)
  t.deepEquals(rLink, {'/': 'data'})

  t.end()
})
