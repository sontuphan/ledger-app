import { useCallback, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerSolana } from '@ledgerhq/device-signer-kit-solana/internal/DefaultSignerSolana.js'
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Decoder,
  getCompiledTransactionMessageEncoder,
  getTransactionEncoder,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signatureBytes,
  type TransactionMessageBytes,
} from '@solana/kit'
import { getAddMemoInstruction } from '@solana-program/memo'
import { getTransferSolInstruction } from '@solana-program/system'

export type SignTransactionProps = {
  signer?: DefaultSignerSolana
  path: string
}

const rpc = createSolanaRpc('https://api.devnet.solana.com')

export function SignTransaction({ signer, path }: SignTransactionProps) {
  const [sig, setSig] = useState('')

  const onSignTransaction = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable: getAddress } = signer.getAddress(`${path}/0'/0'`)
    const addr = await firstValueFrom(
      getAddress.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map(({ output }) => output),
      ),
    )

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
      (m) => compileTransactionMessage(m),
    )

    const serializedTx = getCompiledTransactionMessageEncoder().encode(
      tx,
    ) as TransactionMessageBytes

    const { observable: signTransaction } = signer.signTransaction(
      `${path}/0'/0'`,
      Uint8Array.from(serializedTx),
    )
    const signature = await firstValueFrom(
      signTransaction.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    const signedTransaction = getTransactionEncoder().encode({
      messageBytes: serializedTx,
      signatures: {
        [address(addr)]: signatureBytes(signature),
      },
    })

    return setSig(getBase58Decoder().decode(signedTransaction))
  }, [signer, path])

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
