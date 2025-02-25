import {
  MitoDenomBalance,
  MitoHolders,
  MitoLeaderboard,
  MitoPortfolio,
  MitoPagination,
  MitoPriceSnapshot,
  MitoProfits,
  MitoSubaccountBalance,
  MitoSubscription,
  MitoVault,
} from '../types/mito'
import { MitoApi } from '@injectivelabs/mito-proto-ts'

/**
 * @category Indexer Grpc Transformer
 */
export class IndexerGrpcMitoTransformer {
  static mitoPaginationToPagination(
    pagination?: MitoApi.Pagination,
  ): MitoPagination | undefined {
    if (!pagination) {
      return undefined
    }

    return {
      total: pagination.total,
    }
  }

  static mitoDenomBalanceToDenomBalance(
    denomBalance: MitoApi.DenomBalance,
  ): MitoDenomBalance {
    return {
      denom: denomBalance.denom,
      totalBalance: denomBalance.totalBalance,
    }
  }

  static profitsResponseToProfits(
    mitoProfits?: MitoApi.Profits,
  ): MitoProfits | undefined {
    if (!mitoProfits) {
      return undefined
    }

    return {
      allTimeChange: mitoProfits.allTimeChange,
      threeMonthsChange: mitoProfits.threeMonthsChange,
      oneMonthChange: mitoProfits.oneMonthChange,
      oneDayChange: mitoProfits.oneDayChange,
      oneWeekChange: mitoProfits.oneWeekChange,
      oneYearChange: mitoProfits.oneYearChange,
      threeYearsChange: mitoProfits.threeYearsChange,
      sixMonthsChange: mitoProfits.sixMonthsChange,
    }
  }

  static mitoSubaccountInfoToSubaccountInfo(
    mitoSubaccountInfo?: MitoApi.SubaccountBalance,
  ): MitoSubaccountBalance | undefined {
    if (!mitoSubaccountInfo) {
      return
    }

    return {
      subaccountId: mitoSubaccountInfo.subaccountId,
      balancesList: mitoSubaccountInfo.balances.map(
        IndexerGrpcMitoTransformer.mitoDenomBalanceToDenomBalance,
      ),
    }
  }

  static mitoVaultToVault(vault: MitoApi.Vault): MitoVault {
    return {
      contractAddress: vault.contractAddress,
      codeId: vault.codeId,
      vaultName: vault.vaultName,
      marketId: vault.marketId,
      currentTvl: vault.currentTvl,
      profits: IndexerGrpcMitoTransformer.profitsResponseToProfits(
        vault.profits,
      ),
      updatedAt: vault.updatedAt,
      vaultType: vault.vaultType,
      lpTokenPrice: vault.lpTokenPrice,
      subaccountInfo:
        IndexerGrpcMitoTransformer.mitoSubaccountInfoToSubaccountInfo(
          vault.subaccountInfo,
        ),
      masterContractAddress: vault.masterContractAddress,
      totalLpAmount: vault.totalLpAmount,
    }
  }

  static mitoPriceSnapshotToPriceSnapshot(
    snapshot: MitoApi.PriceSnapshot,
  ): MitoPriceSnapshot {
    return {
      price: snapshot.price,
      updatedAt: snapshot.updatedAt,
    }
  }

  static vaultResponseToVault(response: MitoApi.GetVaultResponse): MitoVault {
    const [vault] = response.vault

    return IndexerGrpcMitoTransformer.mitoVaultToVault(vault)
  }

  static vaultsResponseToVaults(response: MitoApi.GetVaultsResponse): {
    vaults: MitoVault[]
    pagination?: MitoPagination
  } {
    return {
      vaults: response.vaults.map(IndexerGrpcMitoTransformer.mitoVaultToVault),
      pagination: IndexerGrpcMitoTransformer.mitoPaginationToPagination(
        response.pagination,
      ),
    }
  }

  static LPTokenPriceChartResponseToLPTokenPriceChart(
    response: MitoApi.LPTokenPriceChartResponse,
  ): MitoPriceSnapshot[] {
    return response.prices.map(
      IndexerGrpcMitoTransformer.mitoPriceSnapshotToPriceSnapshot,
    )
  }

  static VaultsByHolderAddressResponseToVaultsByHolderAddress(
    response: MitoApi.VaultsByHolderAddressResponse,
  ): MitoSubscription[] {
    return response.subscriptions.map((subscription) => {
      const vaultInfo = subscription.vaultInfo
        ? IndexerGrpcMitoTransformer.mitoVaultToVault(subscription.vaultInfo)
        : undefined

      return {
        vaultInfo,
        lpAmount: subscription.lpAmount,
        lpAmountPercentage: subscription.lpAmountPercentage,
        holderAddress: subscription.holderAddress,
      }
    })
  }

  static LPHoldersResponseToLPHolders(
    response: MitoApi.LPHoldersResponse,
  ): MitoHolders[] {
    return response.holders.map((holder) => ({
      holderAddress: holder.holderAddress,
      vaultAddress: holder.vaultAddress,
      amount: holder.amount,
      updatedAt: holder.updatedAt,
      lpAmountPercentage: holder.lpAmountPercentage,
      redemptionLockTime: holder.redemptionLockTime,
    }))
  }

  static PortfolioResponseToPortfolio(
    response: MitoApi.PortfolioResponse,
  ): MitoPortfolio {
    return {
      totalValue: response.totalValue,
      pnl: response.pnl,
      totalValueChartList: response.totalValueChart.map(
        IndexerGrpcMitoTransformer.mitoPriceSnapshotToPriceSnapshot,
      ),
      pnlChartList: response.pnlChart.map(
        IndexerGrpcMitoTransformer.mitoPriceSnapshotToPriceSnapshot,
      ),
    }
  }

  static LeaderboardResponseToLeaderboard(
    response: MitoApi.LeaderboardResponse,
  ): MitoLeaderboard {
    return {
      entriesList: response.entries.map((entry) => ({
        address: entry.address,
        pnl: entry.pnl,
      })),
      snapshotBlock: response.snapshotBlock,
      updatedAt: response.updatedAt,
    }
  }
}
