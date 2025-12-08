import { useCallback, useEffect, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerEth } from '@ledgerhq/device-signer-kit-ethereum/internal/DefaultSignerEth.js'
import { verifyMessage, type Hex } from 'viem'

const MESSAGE = 'hello world'

export type SignMessageProps = { signer?: DefaultSignerEth; path: string }

export function SignMessage({ signer, path }: SignMessageProps) {
  const [sig, setSig] = useState('')
  const [valid, setValid] = useState(false)

  const onSignMessage = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable } = signer.signMessage(`${path}/0/0`, MESSAGE)
    const { r, s, v } = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    return setSig(
      r.replace(/^0x/, '') + s.replace(/^0x/, '') + BigInt(v).toString(16),
    )
  }, [signer, path])

  const onVerifyMessage = useCallback(async () => {
    if (!signer || !sig) return setValid(false)
    const { observable } = signer.getAddress(`${path}/0/0`)
    const address = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output.address),
      ),
    )
    const ok = await verifyMessage({
      address,
      message: MESSAGE,
      signature: `0x${sig}`,
    })
    return setValid(ok)
  }, [signer, sig, path])

  useEffect(() => {
    onVerifyMessage()
  }, [onVerifyMessage])

  return (
    <div className="w-full flex flex-col gap-4">
      <div>
        <button className="btn btn-primary" onClick={onSignMessage}>
          Sign message
        </button>
      </div>
      <p>
        <span className="opacity-60">Valid: </span>
        {valid.toString()}
      </p>
      <p className="text-base-content whitespace-normal wrap-break-word">
        <span className="opacity-60">Signature: </span>
        {sig}
      </p>
    </div>
  )
}
