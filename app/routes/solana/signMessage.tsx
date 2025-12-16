import { useCallback, useEffect, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerSolana } from '@ledgerhq/device-signer-kit-solana/internal/DefaultSignerSolana.js'
import { signatureBytes, verifySignature } from '@solana/keys'
import { getBase58Encoder } from '@solana/codecs'
import { address, getAddressEncoder } from '@solana/addresses'

const MESSAGE = 'hello world'
const ADPU_MARKER = new TextEncoder().encode('solana offchain')

export type SignMessageProps = { signer?: DefaultSignerSolana; path: string }

export function SignMessage({ signer, path }: SignMessageProps) {
  const [sig, setSig] = useState('')
  const [valid, setValid] = useState(false)

  const onSignMessage = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable } = signer.signMessage(`${path}/0'/0'`, MESSAGE)
    const { signature } = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    return setSig(signature)
  }, [signer, path])

  const onVerifyMessage = useCallback(async () => {
    if (!signer || !sig) return setValid(false)
    const { observable } = signer.getAddress(`${path}/0'/0'`)
    const addr = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    const publicKey = await crypto.subtle.importKey(
      'raw',
      Buffer.from(getAddressEncoder().encode(address(addr))),
      { name: 'Ed25519' },
      true,
      ['verify'],
    )

    const pubkey = getAddressEncoder().encode(address(addr))

    const markers = new RegExp(`${pubkey.toString()}|${ADPU_MARKER.toString()}`)

    const chunk = new Uint8Array(
      getBase58Encoder()
        .encode(sig)
        .toString()
        .split(markers)
        .at(0)!
        .split(',')
        .filter((e) => !!e)
        .map((e) => parseInt(e)),
    )

    const signature = chunk.subarray(2, 66)
    // console.log(
    //   chunk.subarray(0, 1).toString(),
    //   chunk.subarray(1, 33).toString(),
    //   chunk.subarray(33, 65).toString(),
    //   chunk.subarray(65).toString(),
    // )

    const ok = await verifySignature(
      publicKey,
      signatureBytes(signature),
      new TextEncoder().encode(MESSAGE),
    )
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
