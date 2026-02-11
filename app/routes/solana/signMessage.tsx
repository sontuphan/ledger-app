import { useCallback, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerSolana } from '@ledgerhq/device-signer-kit-solana/internal/DefaultSignerSolana.js'
import { verifySignature } from '@solana/keys'
import { getBase58Decoder, getBase58Encoder } from '@solana/codecs'
import { address, getPublicKeyFromAddress } from '@solana/addresses'
import {
  getOffchainMessageEncoder,
  getOffchainMessageEnvelopeDecoder,
  offchainMessageApplicationDomain,
  offchainMessageContentRestrictedAsciiOf1232BytesMax,
  type OffchainMessage,
} from '@solana/offchain-messages'
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system'

const MESSAGE = 'hello world'

const constructOffchainMessageContent = (addr: string, message: string) => {
  const offchainMessage: OffchainMessage = {
    version: 0,
    requiredSignatories: [{ address: address(addr) }],
    applicationDomain: offchainMessageApplicationDomain(SYSTEM_PROGRAM_ADDRESS),
    content: offchainMessageContentRestrictedAsciiOf1232BytesMax(message),
  }

  return getOffchainMessageEncoder().encode(offchainMessage)
}

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
    const pubkey = await getPublicKeyFromAddress(address(addr))

    if (
      !sig ||
      constructOffchainMessageContent(addr, MESSAGE).toString() !==
        content.toString()
    ) {
      setSig('')
      return setValid(false)
    }

    const ok = await verifySignature(pubkey, sig, content)
    setSig(getBase58Decoder().decode(sig))
    return setValid(ok)
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
