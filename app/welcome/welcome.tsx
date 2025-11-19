import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} from '@ledgerhq/device-management-kit'
import { webHidTransportFactory } from '@ledgerhq/device-transport-kit-web-hid'
import { SignerBtcBuilder } from '@ledgerhq/device-signer-kit-bitcoin'
import { payments } from 'bitcoinjs-lib'
import { BIP32Factory } from 'bip32'
import * as ecc from '@bitcoinerlab/secp256k1'
import { regtest } from 'bitcoinjs-lib/src/networks'
import { SignTransaction } from './signTransaction'
import { SignMessage } from './signMessage'

const PATH = "84'/0'/0'/0/0"

const bip32 = BIP32Factory(ecc)

const dmk = new DeviceManagementKitBuilder()
  .addTransport(webHidTransportFactory)
  .build()

export function Welcome() {
  const [sessionId, setSessionId] = useState('')
  const [xpub, setXpub] = useState('')

  const onConnect = useCallback(() => {
    return dmk.startDiscovering({}).subscribe({
      next: async (device) => {
        const sessionId = await dmk.connect({
          device,
          sessionRefresherOptions: { isRefresherDisabled: true },
        })
        return setSessionId(sessionId)
      },
      error: () => {
        return setSessionId('')
      },
    })
  }, [])

  const onDisconnect = useCallback(async () => {
    await dmk.disconnect({ sessionId })
    return setSessionId('')
  }, [sessionId])

  const signer = useMemo(() => {
    if (!sessionId) return undefined
    return new SignerBtcBuilder({ dmk, sessionId }).build()
  }, [sessionId])

  useEffect(() => {
    signer?.getExtendedPublicKey(PATH).observable.subscribe({
      next: (evt) => {
        if (evt.status === DeviceActionStatus.Error) return setXpub('')
        if (evt.status === DeviceActionStatus.Completed)
          return setXpub(evt.output.extendedPublicKey)
      },
      error: () => {
        return setXpub('')
      },
    })
  }, [signer])

  const address = useMemo(() => {
    if (!xpub) return ''
    const account = bip32.fromBase58(xpub)
    const { address } = payments.p2wpkh({
      pubkey: account.publicKey,
      network: regtest,
    })
    return address
  }, [xpub])

  return (
    <main className="w-full flex flex-col items-center justify-center p-16 gap-8">
      <div className="w-full gap-16 min-h-0">
        <button
          className="btn btn-primary"
          onClick={!signer ? onConnect : onDisconnect}
        >
          {!signer ? 'Connect' : 'Disconnect'}
        </button>
      </div>
      <div className="w-full gap-16 min-h-0">
        <p className="w-full text-base-content whitespace-normal wrap-break-word">
          {address}
        </p>
      </div>
      <div className="w-full gap-16 min-h-0">
        {sessionId && <SignMessage path={PATH} signer={signer} />}
      </div>
      <div className="w-full gap-16 min-h-0">
        {sessionId && <SignTransaction path={PATH} signer={signer} />}
      </div>
    </main>
  )
}
