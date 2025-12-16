import { useCallback } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerSolana } from '@ledgerhq/device-signer-kit-solana/internal/DefaultSignerSolana.js'
import { createPublicClient, http, parseEther } from 'viem'
import { sepolia } from 'viem/chains'
import { getBytes, Signature, Transaction } from 'ethers'

export type SignTransactionProps = {
  signer?: DefaultSignerSolana
  path: string
}

export function SignTransaction({ signer, path }: SignTransactionProps) {
  const onSignTransaction = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable } = signer.getAddress(`${path}/0/0`)
    const address = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map(({ output: { address } }) => address),
      ),
    )

    const client = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    const unsignedTx = await client.prepareTransactionRequest({
      account: address,
      to: address,
      value: parseEther('0.0001'),
    })

    const tx = Transaction.from({
      chainId: unsignedTx.chainId,
      gasLimit: unsignedTx.gas,
      maxFeePerGas: unsignedTx.maxFeePerGas,
      maxPriorityFeePerGas: unsignedTx.maxPriorityFeePerGas,
      nonce: unsignedTx.nonce,
      to: unsignedTx.to,
      value: unsignedTx.value,
    })

    const { observable: signTransaction } = signer.signTransaction(
      `${path}/0/0`,
      getBytes(tx.unsignedSerialized),
    )
    const { r, s, v } = await firstValueFrom(
      signTransaction.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    tx.signature = Signature.from({ r, s, v })

    return tx.serialized
  }, [signer, path])

  return (
    <button className="btn btn-primary" onClick={onSignTransaction}>
      Sign transaction
    </button>
  )
}
