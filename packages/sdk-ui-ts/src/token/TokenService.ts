import { Network, NetworkEndpoints } from '@injectivelabs/networks'
import { ChainId, Coin } from '@injectivelabs/ts-types'
import {
  DenomClient,
  ContractAccountBalance,
  ExplorerCW20BalanceWithToken,
} from '@injectivelabs/sdk-ts'
import {
  BankBalances,
  CoinWithLabel,
  UiBaseSpotMarket,
  UiSubaccountBalance,
  UiBasePerpetualMarket,
  UiBaseSpotMarketWithToken,
  UiBaseBinaryOptionsMarket,
  UiBaseExpiryFuturesMarket,
  PerpetualMarketWithTokenAndSlug,
  BinaryOptionsMarketWithTokenAndSlug,
  ExpiryFuturesMarketWithTokenAndSlug,
} from '../client/types'
import {
  BalanceWithToken,
  UiBridgeTransaction,
  SubaccountBalanceWithToken,
  UiBridgeTransactionWithToken,
} from '../types'
import {
  Token,
  TokenType,
  getUnknownToken,
} from '@injectivelabs/token-metadata'
import { awaitForAll } from '@injectivelabs/utils'

/**
 * With the TokenService class we can convert objects
 * with denoms to append token metadata information
 */
export class TokenService {
  public network: Network

  public chainId: ChainId

  public denomClient: DenomClient

  constructor({
    chainId,
    network,
    endpoints,
  }: {
    chainId: ChainId
    network: Network
    endpoints?: NetworkEndpoints
  }) {
    this.network = network
    this.chainId = chainId
    this.denomClient = new DenomClient(network, endpoints ? { endpoints } : {})
  }

  async toCoinsWithToken(supply: Coin[]): Promise<Token[]> {
    const tokens = await awaitForAll(supply, (coin) =>
      this.denomClient.getDenomToken(coin.denom),
    )

    return tokens.filter((token) => token) as Token[]
  }

  async toSupplyWithToken(supply: Coin[]): Promise<Token[]> {
    return this.toCoinsWithToken(supply)
  }

  async toSupplyWithTokenAndLabel(supply: Coin[]): Promise<{
    bankSupply: CoinWithLabel[]
    ibcBankSupply: CoinWithLabel[]
  }> {
    const supplyWithToken = await this.toSupplyWithToken(supply)

    const supplyWithLabel = supplyWithToken
      .map((token) => {
        const coin = supply.find(({ denom }) => denom === token.denom)

        if (!coin) {
          return
        }

        return {
          ...coin,
          code: coin.denom,
          label: token ? token.symbol : coin.denom,
        }
      })
      .filter((coinWithLabel) => coinWithLabel) as CoinWithLabel[]

    return {
      bankSupply: supplyWithLabel.filter(
        (supply) => supply && supply.denom && !supply.denom.startsWith('ibc/'),
      ),
      ibcBankSupply: supplyWithLabel.filter(
        (supply) => supply && supply.denom && !supply.denom.startsWith('ibc/'),
      ),
    }
  }

  async toBalancesWithToken(
    balances: BankBalances,
    ibcBalances: BankBalances,
  ): Promise<{
    bankBalancesWithToken: BalanceWithToken[]
    ibcBankBalancesWithToken: BalanceWithToken[]
  }> {
    const bankBalancesWithToken = (
      await awaitForAll(Object.keys(balances), async (denom) => ({
        denom,
        balance: balances[denom],
        token: await this.denomClient.getDenomToken(denom),
      }))
    ).filter((balance) => balance.token !== undefined) as BalanceWithToken[]

    const ibcBankBalancesWithToken = (
      await awaitForAll(Object.keys(ibcBalances), async (denom) => {
        return {
          denom,
          balance: ibcBalances[denom],
          token: await this.denomClient.getDenomToken(denom),
        }
      })
    ).filter((balance) => balance.token !== undefined) as BalanceWithToken[]

    return {
      bankBalancesWithToken,
      ibcBankBalancesWithToken,
    }
  }

  async toCw20BalancesWithToken(
    cw20Balances: ExplorerCW20BalanceWithToken[],
  ): Promise<BalanceWithToken[]> {
    const balancesWithToken = await awaitForAll(
      cw20Balances,
      async (balance) => {
        const token = await this.denomClient.getDenomToken(
          balance.contractAddress,
        )

        if (!token) {
          return
        }

        return {
          ...balance,
          token,
          denom: token.denom,
        }
      },
    )

    return balancesWithToken.filter((balance) => balance) as BalanceWithToken[]
  }

  async toContractCw20BalancesWithToken({
    contractAddress,
    contractAccountsBalance,
  }: {
    contractAddress: string
    contractAccountsBalance: ContractAccountBalance[]
  }): Promise<BalanceWithToken[]> {
    const token = await this.denomClient.getDenomToken(contractAddress)
    const defaultToken = {
      name: contractAddress,
      logo: '',
      denom: contractAddress,
      tokenType: TokenType.Cw20,
    } as Token

    // When token can't be fetched from the token-metadata, we use a default token.
    const tokenOrDefaultToken = token || defaultToken

    return contractAccountsBalance.map((balance) => {
      return {
        ...balance,
        token: tokenOrDefaultToken,
        denom: tokenOrDefaultToken.denom || contractAddress,
      }
    })
  }

  async toSubaccountBalanceWithToken(
    balance: UiSubaccountBalance,
  ): Promise<SubaccountBalanceWithToken> {
    return {
      token: (await this.denomClient.getDenomToken(balance.denom)) as Token,
      denom: balance.denom,
      availableBalance: balance.availableBalance,
      totalBalance: balance.totalBalance,
    }
  }

  async toSubaccountBalancesWithToken(
    balances: UiSubaccountBalance[],
  ): Promise<SubaccountBalanceWithToken[]> {
    return (
      await awaitForAll(balances, this.toSubaccountBalanceWithToken.bind(this))
    ).filter(
      (balance) => balance.token !== undefined,
    ) as SubaccountBalanceWithToken[]
  }

  async toSpotMarketWithToken(
    market: UiBaseSpotMarket,
  ): Promise<UiBaseSpotMarketWithToken> {
    const baseToken = await this.denomClient.getDenomToken(market.baseDenom)
    const quoteToken = await this.denomClient.getDenomToken(market.quoteDenom)
    const slug =
      baseToken && quoteToken
        ? `${baseToken.symbol.toLowerCase()}-${quoteToken.symbol.toLowerCase()}`
        : market.ticker.replace('/', '-').replace(' ', '-').toLowerCase()

    return {
      ...market,
      slug,
      baseToken,
      quoteToken,
    } as UiBaseSpotMarketWithToken
  }

  async toSpotMarketsWithToken(
    markets: UiBaseSpotMarket[],
  ): Promise<UiBaseSpotMarketWithToken[]> {
    return (
      await awaitForAll(markets, this.toSpotMarketWithToken.bind(this))
    ).filter(
      (market) =>
        market.baseToken !== undefined && market.quoteToken !== undefined,
    ) as UiBaseSpotMarketWithToken[]
  }

  async toDerivativeMarketWithToken<
    T extends UiBasePerpetualMarket | UiBaseExpiryFuturesMarket,
    R extends
      | PerpetualMarketWithTokenAndSlug
      | ExpiryFuturesMarketWithTokenAndSlug,
  >(market: T): Promise<R> {
    const slug = market.ticker
      .replaceAll('/', '-')
      .replaceAll(' ', '-')
      .toLowerCase()
    const [baseTokenSymbol] = slug.split('-')
    const baseToken = await this.denomClient.getDenomToken(baseTokenSymbol)
    const quoteToken = await this.denomClient.getDenomToken(market.quoteDenom)

    return {
      ...market,
      slug,
      baseToken,
      quoteToken,
    } as unknown as R
  }

  async toDerivativeMarketsWithToken(
    markets: Array<UiBasePerpetualMarket | UiBaseExpiryFuturesMarket>,
  ): Promise<
    Array<PerpetualMarketWithTokenAndSlug | ExpiryFuturesMarketWithTokenAndSlug>
  > {
    return (
      await awaitForAll(markets, this.toDerivativeMarketWithToken.bind(this))
    ).filter(
      (market) =>
        market.baseToken !== undefined && market.quoteToken !== undefined,
    ) as Array<
      PerpetualMarketWithTokenAndSlug | ExpiryFuturesMarketWithTokenAndSlug
    >
  }

  async toBinaryOptionsMarketWithToken(
    market: UiBaseBinaryOptionsMarket,
  ): Promise<BinaryOptionsMarketWithTokenAndSlug> {
    const quoteToken = await this.denomClient.getDenomToken(market.quoteDenom)
    const slug = market.ticker
      .replaceAll('/', '-')
      .replaceAll(' ', '-')
      .toLowerCase()
    const [baseTokenSymbol] = quoteToken
      ? market.ticker.replace(quoteToken.symbol, '')
      : market.ticker.replace('/', '')
    const baseToken = {
      denom: slug,
      logo: 'injective-v3.svg',
      icon: 'injective-v3.svg',
      symbol: baseTokenSymbol,
      name: baseTokenSymbol,
      decimals: 18,
      coinGeckoId: '',
      tokenType: TokenType.Native,
    } as Token

    return {
      ...market,
      slug,
      baseToken,
      quoteToken,
    } as BinaryOptionsMarketWithTokenAndSlug
  }

  async toBinaryOptionsMarketsWithToken(
    markets: UiBaseBinaryOptionsMarket[],
  ): Promise<BinaryOptionsMarketWithTokenAndSlug[]> {
    return (
      await awaitForAll(markets, this.toBinaryOptionsMarketWithToken.bind(this))
    ).filter(
      (market) =>
        market.baseToken !== undefined && market.quoteToken !== undefined,
    ) as BinaryOptionsMarketWithTokenAndSlug[]
  }

  async toBridgeTransactionWithToken(
    transaction: UiBridgeTransaction,
  ): Promise<UiBridgeTransactionWithToken> {
    const transactionExists =
      transaction && transaction.denom && Object.keys(transaction).length > 0

    if (!transactionExists) {
      return {} as UiBridgeTransactionWithToken
    }

    /**
     * Transferring native INJ from IBC chain
     * to Injective (ex: Osmosis -> Injective)
     */
    if (
      transaction.denom.startsWith('transfer') &&
      transaction.denom.endsWith('inj')
    ) {
      return {
        ...transaction,
        token: (await this.denomClient.getDenomToken('INJ'))!,
      }
    }

    const tokenFromDenomAsSymbol = (await this.denomClient.getDenomToken(
      transaction.denom,
    )) as Token

    if (tokenFromDenomAsSymbol) {
      return {
        ...transaction,
        token: tokenFromDenomAsSymbol,
      }
    }

    return {
      ...transaction,
      token: getUnknownToken(transaction.denom),
    } as UiBridgeTransactionWithToken
  }

  async toBridgeTransactionsWithToken(
    transactions: UiBridgeTransaction[],
  ): Promise<UiBridgeTransactionWithToken[]> {
    return (
      await awaitForAll(
        transactions,
        this.toBridgeTransactionWithToken.bind(this),
      )
    ).filter(
      (transaction) => transaction && transaction.token !== undefined,
    ) as UiBridgeTransactionWithToken[]
  }
}
