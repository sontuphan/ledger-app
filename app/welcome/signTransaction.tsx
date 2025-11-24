import { useCallback } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import {
  DefaultDescriptorTemplate,
  DefaultWallet,
} from '@ledgerhq/device-signer-kit-bitcoin'
import type { DefaultSignerBtc } from '@ledgerhq/device-signer-kit-bitcoin/internal/DefaultSignerBtc.js'
import { payments, Psbt, networks } from 'bitcoinjs-lib'
import { BIP32Factory } from 'bip32'
import * as ecc from '@bitcoinerlab/secp256k1'
import { filter, firstValueFrom, map } from 'rxjs'

const bip32 = BIP32Factory(ecc)

export type SignTransactionProps = {
  masterFingerprint: string
  signer?: DefaultSignerBtc
  path: string
}

export function SignTransaction({
  masterFingerprint,
  signer,
  path,
}: SignTransactionProps) {
  const onSignTransaction = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable: getttingXpub } = signer.getExtendedPublicKey(
      `${path}/0/0`,
    )
    const account = await firstValueFrom(
      getttingXpub.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map(({ output: { extendedPublicKey } }) =>
          bip32.fromBase58(extendedPublicKey),
        ),
      ),
    )

    const p2wpkh = payments.p2wpkh({
      pubkey: account.publicKey,
      network: networks.bitcoin,
    })

    const utxo = {
      txid: 'cadb0f4ec36b4224cfad23c3add46d03fe500b0d8f0760e913dcbf29210bd8fe',
      vout: 0,
      value: 5_000_000_000,
    } // dummy tx

    if (!p2wpkh.address || !p2wpkh.output)
      throw new Error('Cannot construct the PSBT')

    const psbt = new Psbt({ network: networks.bitcoin })
      .addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: p2wpkh.output,
          value: utxo.value,
        },
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(masterFingerprint, 'hex'),
            path: `m/${path}/0/0`,
            pubkey: account.publicKey,
          },
        ],
      })
      .addOutput({
        address: p2wpkh.address, // send to myself
        value: utxo.value - 500, // minus fee
      })

    const { observable: signingPsbt } = signer.signPsbt(
      new DefaultWallet(path, DefaultDescriptorTemplate.NATIVE_SEGWIT),
      psbt,
    )
    const [partialSig] = await firstValueFrom(
      signingPsbt.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output),
      ),
    )

    console.log(partialSig)
  }, [masterFingerprint, signer, path])

  return (
    <button className="btn btn-primary" onClick={onSignTransaction}>
      Sign transaction
    </button>
  )
}
