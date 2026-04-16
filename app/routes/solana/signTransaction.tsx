import { useCallback, useState } from 'react'

import { type WalletAccountSolana } from '@tetherto/wdk-wallet-solana'

import {
  address,
  appendTransactionMessageInstruction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit'
import { getAddMemoInstruction } from '@solana-program/memo'
import { getTransferSolInstruction } from '@solana-program/system'

export type SignTransactionProps = {
  signer?: WalletAccountSolana
  path: string
}

const rpc = createSolanaRpc('https://api.devnet.solana.com')

export function SignTransaction({ signer, path }: SignTransactionProps) {
  const [sig, setSig] = useState('')

  const onSignTransaction = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const addr = await signer.getAddress()

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

    const tx = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(address(addr), m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) =>
        appendTransactionMessageInstruction(
          getAddMemoInstruction({ memo: 'hello world' }),
          m,
        ),
      (m) =>
        appendTransactionMessageInstruction(
          getTransferSolInstruction({
            amount: lamports(25_000_000n),
            destination: address(addr),
            source: createNoopSigner(address(addr)),
          }),
          m,
        ),
    )

    const { hash } = await signer.sendTransaction(tx)

    return setSig(hash)
  }, [signer])

  return (
    <div className="w-full flex flex-col gap-4">
      <div>
        <button className="btn btn-primary" onClick={onSignTransaction}>
          Sign transaction
        </button>
      </div>
      <p className="text-base-content whitespace-normal wrap-break-word">
        <span className="opacity-60">Signed Tx: </span>
        {sig}
      </p>
    </div>
  )
}
