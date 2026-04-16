import type { Route } from './+types'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { WalletAccountSolana } from '@tetherto/wdk-wallet-solana'
import { LedgerSignerSolana } from '@tetherto/wdk-wallet-solana/signers'

import { SignMessage } from './signMessage'
import { SignTransaction } from './signTransaction'
import { isAddress } from '@solana/kit'

const PATH = "0'/0'/0'"

const ledger = new LedgerSignerSolana(PATH)
ledger._path = "44'/501'/0'/0'/0'"
console.log(ledger._path)
const signer = new WalletAccountSolana(ledger, {
  rpcUrl: 'https://api.devnet.solana.com',
})

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Solana App' },
    { name: 'description', content: 'Solana App' },
  ]
}

export default function Solana() {
  const [address, setAddress] = useState('')

  const onConnect = useCallback(async () => {
    try {
      const address = await signer.getAddress()
      return setAddress(address)
    } catch (er) {
      console.error(er)
      return setAddress('')
    }
  }, [])

  const onDisconnect = useCallback(async () => {
    if (isAddress(address)) {
      signer.dispose()
      return setAddress('')
    }
  }, [address])

  return (
    <main className="w-full flex flex-col items-center justify-center p-16 gap-8">
      <p className="w-full opacity-60 font-bold">Solana App</p>
      <div className="w-full gap-16 min-h-0">
        <button
          className="btn btn-primary"
          onClick={!address ? onConnect : onDisconnect}
        >
          {!address ? 'Connect' : 'Disconnect'}
        </button>
      </div>
      <div className="w-full gap-16 min-h-0">
        <p className="w-full text-base-content whitespace-normal wrap-break-word">
          {address}
        </p>
      </div>
      <div className="w-full gap-16 min-h-0">
        {address && <SignMessage path={PATH} signer={signer} />}
      </div>
      <div className="w-full gap-16 min-h-0">
        {address && <SignTransaction path={PATH} signer={signer} />}
      </div>
    </main>
  )
}
