import type { Route } from './+types'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
} from '@ledgerhq/device-management-kit'
import { webHidTransportFactory } from '@ledgerhq/device-transport-kit-web-hid'
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum'
import { SignMessage } from './signMessage'

const PATH = "44'/60'/0'"

const dmk = new DeviceManagementKitBuilder()
  .addTransport(webHidTransportFactory)
  .build()

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Ethereum App' },
    { name: 'description', content: 'Ethereum App' },
  ]
}

export default function Ethereum() {
  const [sessionId, setSessionId] = useState('')
  const [address, setAddress] = useState('')

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
    return new SignerEthBuilder({ dmk, sessionId }).build()
  }, [sessionId])

  useEffect(() => {
    signer?.getAddress(`${PATH}/0/0`).observable.subscribe({
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
      <p className="w-full opacity-60 font-bold">Ethereum App</p>
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
        {sessionId && 'Sign Transaction'}
      </div>
    </main>
  )
}
