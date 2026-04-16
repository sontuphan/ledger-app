import { useCallback, useState } from 'react'

import { type WalletAccountSolana } from '@tetherto/wdk-wallet-solana'

const MESSAGE = 'hello world'

export type SignMessageProps = { signer?: WalletAccountSolana; path: string }

export function SignMessage({ signer, path }: SignMessageProps) {
  const [sig, setSig] = useState('')
  const [valid, setValid] = useState(false)

  const onSignMessage = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const sig = await signer.sign(MESSAGE)

    if (!sig) {
      setSig('')
      return setValid(false)
    }

    const ok = await signer.verify(MESSAGE, sig)
    setSig(sig)
    return setValid(ok)
  }, [signer])

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
