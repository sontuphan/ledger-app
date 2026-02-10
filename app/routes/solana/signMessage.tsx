import { useCallback, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerSolana } from '@ledgerhq/device-signer-kit-solana/internal/DefaultSignerSolana.js'
import { verifySignature } from '@solana/keys'
import { getBase58Decoder, getBase58Encoder } from '@solana/codecs'
import { address, getPublicKeyFromAddress } from '@solana/addresses'
import { getOffchainMessageEnvelopeDecoder } from '@solana/offchain-messages'

const MESSAGE = 'hello world'

export type SignMessageProps = { signer?: DefaultSignerSolana; path: string }

export function SignMessage({ signer, path }: SignMessageProps) {
  const [sig, setSig] = useState('')
  const [valid, setValid] = useState(false)

  const onSignMessage = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable } = signer.signMessage(`${path}/0'/0'`, MESSAGE)
    const { signature: envelopedSignature } = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    const { content, signatures } = getOffchainMessageEnvelopeDecoder().decode(
      getBase58Encoder().encode(envelopedSignature),
    )

    const [[addr, sig]] = Object.entries(signatures)

    if (sig) {
      const ok = await verifySignature(
        await getPublicKeyFromAddress(address(addr)),
        sig,
        content,
      )

      setSig(getBase58Decoder().decode(sig))
      return setValid(ok)
    } else {
      setSig('')
      return setValid(false)
    }
  }, [signer, path])

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
