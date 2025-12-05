import type { Route } from './+types'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  CommandResultStatus,
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} from '@ledgerhq/device-management-kit'
import { webHidTransportFactory } from '@ledgerhq/device-transport-kit-web-hid'
import {
  DefaultDescriptorTemplate,
  DefaultWallet,
  SignerBtcBuilder,
} from '@ledgerhq/device-signer-kit-bitcoin'
import { SignTransaction } from './signTransaction'
import { SignMessage } from './signMessage'
import { GetMasterFingerprintCommand } from '@ledgerhq/device-signer-kit-bitcoin/internal/app-binder/command/GetMasterFingerprintCommand.js'

const PATH = "84'/0'/0'"

const dmk = new DeviceManagementKitBuilder()
  .addTransport(webHidTransportFactory)
  .build()

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Bitcoin App' },
    { name: 'description', content: 'Bitcoin App' },
  ]
}

export default function Bitcoin() {
  const [sessionId, setSessionId] = useState('')
  const [address, setAddress] = useState('')
  const [masterFingerprint, setMasterFingerprint] = useState('')

  const onConnect = useCallback(() => {
    return dmk.startDiscovering({}).subscribe({
      next: async (device) => {
        const sessionId = await dmk.connect({
          device,
          sessionRefresherOptions: { isRefresherDisabled: true },
        })

        const re = await dmk.sendCommand({
          sessionId,
          command: new GetMasterFingerprintCommand(),
        })

        if (re.status === CommandResultStatus.Error)
          throw new Error('Cannot connect to the device')

        setMasterFingerprint(
          Buffer.from(re.data.masterFingerprint).toString('hex'),
        )
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
    signer
      ?.getWalletAddress(
        new DefaultWallet(PATH, DefaultDescriptorTemplate.NATIVE_SEGWIT),
        0,
      )
      .observable.subscribe({
        next: (evt) => {
          if (evt.status === DeviceActionStatus.Error) return setAddress('')
          if (evt.status === DeviceActionStatus.Completed)
            return setAddress(evt.output.address)
        },
        error: () => {
          return setAddress('')
        },
      })
  }, [signer])

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
        {sessionId && (
          <SignTransaction
            masterFingerprint={masterFingerprint}
            path={PATH}
            signer={signer}
          />
        )}
      </div>
    </main>
  )
}
