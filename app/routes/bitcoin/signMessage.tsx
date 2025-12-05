import { useCallback, useEffect, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { crypto, networks } from 'bitcoinjs-lib'
import { BIP32Factory } from 'bip32'
import * as ecc from '@bitcoinerlab/secp256k1'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerBtc } from '@ledgerhq/device-signer-kit-bitcoin/internal/DefaultSignerBtc.js'

const MESSAGE = 'hello world'

const bip32 = BIP32Factory(ecc)

export type SignMessageProps = { signer?: DefaultSignerBtc; path: string }

export function SignMessage({ signer, path }: SignMessageProps) {
  const [sig, setSig] = useState('')
  const [valid, setValid] = useState(false)

  const onSignMessage = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable } = signer.signMessage(`${path}/0/0`, MESSAGE)
    const { r, s } = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    return setSig(r.replace(/^0x/, '') + s.replace(/^0x/, ''))
  }, [signer, path])

  const onVerifyMessage = useCallback(async () => {
    if (!signer || !sig) return setValid(false)
    const { observable } = signer.getExtendedPublicKey(path)
    const xpub = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output.extendedPublicKey),
      ),
    )

    const account = bip32.fromBase58(xpub)

    const data = Buffer.concat([
      Buffer.from(networks.bitcoin.messagePrefix, 'utf8'),
      Buffer.from([MESSAGE.length]),
      Buffer.from(MESSAGE, 'utf8'),
    ])

    const messageHash = crypto.sha256(crypto.sha256(data))
    const signatureBuffer = Buffer.from(sig, 'hex')

    return setValid(account.verify(messageHash, signatureBuffer))
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
