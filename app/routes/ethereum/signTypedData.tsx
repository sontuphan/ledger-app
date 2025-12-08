import { useCallback, useEffect, useState } from 'react'

import { DeviceActionStatus } from '@ledgerhq/device-management-kit'
import { filter, firstValueFrom, map } from 'rxjs'
import type { DefaultSignerEth } from '@ledgerhq/device-signer-kit-ethereum/internal/DefaultSignerEth.js'
import { verifyTypedData, zeroAddress } from 'viem'
import { sepolia } from 'viem/chains'

const TYPED_DATA = {
  domain: {
    name: 'Ethereum App',
    version: '1',
    chainId: sepolia.id,
  },
  types: {
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
  },
  primaryType: 'Person',
  message: {
    name: 'Burner',
    wallet: zeroAddress,
  },
}

export type SignTypedDataProps = { signer?: DefaultSignerEth; path: string }

export function SignTypedData({ signer, path }: SignTypedDataProps) {
  const [sig, setSig] = useState('')
  const [valid, setValid] = useState(false)

  const onSignTypedData = useCallback(async () => {
    if (!signer) throw new Error('Ledger is not connected yet.')

    const { observable } = signer.signTypedData(`${path}/0/0`, TYPED_DATA)
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

  const onVerifyTypedData = useCallback(async () => {
    if (!signer || !sig) return setValid(false)
    const { observable } = signer.getAddress(`${path}/0/0`)
    const address = await firstValueFrom(
      observable.pipe(
        filter((evt) => evt.status === DeviceActionStatus.Completed),
        map((evt) => evt.output.address),
      ),
    )
    const ok = await verifyTypedData({
      address,
      signature: `0x${sig}`,
      domain: TYPED_DATA.domain,
      message: TYPED_DATA.message,
      primaryType: TYPED_DATA.primaryType as 'Person',
      types: TYPED_DATA.types,
    })
    return setValid(ok)
  }, [signer, sig, path])

  useEffect(() => {
    onVerifyTypedData()
  }, [onVerifyTypedData])

  return (
    <div className="w-full flex flex-col gap-4">
      <div>
        <button className="btn btn-primary" onClick={onSignTypedData}>
          Sign typed data
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
