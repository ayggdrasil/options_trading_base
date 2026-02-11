import { initialOptionDetail } from "@/constants/constants.slices";
import { BaseQuoteAsset, NetworkQuoteAsset } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum ModalName {
  SELECTED_OPTION = "SelectedOption",
  SELECTED_OPTION_HIGH_LEVEL = "SelectedOptionHighLevel",
}

interface SelectedOptionState {
  pairedOption: IOptionDetail;
  selectedQuoteAsset: NetworkQuoteAsset<SupportedChains>;
  slippage: number;
  modalNameList: ModalName[];
  isComboMode: boolean;
  isComboModePossible: boolean;
  isScrollToSlippage: boolean;
  selectableOptionPairs: IOptionDetail[];
  size: string;
  sizeAtComboMode: string;
  riskPremium: number;
  riskPremiumAtComboMode: number;
  executionPrice: number;
  executionPriceAtComboMode: number;
  quoteAssetAmount: string;
  quoteAssetAmountAtComboMode: string;
  quoteAssetValue: number;
  quoteAssetValueAtComboMode: number;
  collateralAssetAmount: string;
  collateralAssetAmountAtComboMode: string;
  tradeFeeUsd: number;
  tradeFeeUsdAtComboMode: number;
}
const initialState: SelectedOptionState = {
  pairedOption: initialOptionDetail,
  selectedQuoteAsset: BaseQuoteAsset.USDC,
  slippage: 5,
  modalNameList: [],
  isComboMode: true,
  isComboModePossible: true,
  selectableOptionPairs: [],
  size: "0",
  sizeAtComboMode: "0",
  riskPremium: 0,
  riskPremiumAtComboMode: 0,
  executionPrice: 0,
  executionPriceAtComboMode: 0,
  quoteAssetAmount: "0",
  quoteAssetAmountAtComboMode: "0",
  quoteAssetValue: 0,
  quoteAssetValueAtComboMode: 0,
  collateralAssetAmount: "0",
  collateralAssetAmountAtComboMode: "0",
  tradeFeeUsd: 0,
  tradeFeeUsdAtComboMode: 0,
  isScrollToSlippage: false,
};
export const selectedOptionSlice = createSlice({
  name: "selectedOption",
  initialState,
  reducers: {
    setPairedOption: (state, action: PayloadAction<any>) => {
      state.pairedOption = action.payload;
    },
    resetPairedOption: (state) => {
      state.pairedOption = initialOptionDetail;
    },
    setSelectedQuoteAsset: (state, action: PayloadAction<any>) => {
      state.selectedQuoteAsset = action.payload;
    },
    setSlippage: (state, action: PayloadAction<any>) => {
      state.slippage = action.payload;
    },
    resetSlippage: (state) => {
      state.slippage = 5;
    },
    setIsScrollToSlippage: (state, action: PayloadAction<any>) => {
      state.isScrollToSlippage = action.payload;
    },
    setModalNameList: (state, action: PayloadAction<any>) => {
      state.modalNameList = action.payload;
    },
    removeLastModalName: (state) => {
      if (state.modalNameList.length > 0) {
        state.modalNameList.pop();
      }
    },
    setIsComboMode: (state, action: PayloadAction<any>) => {
      state.isComboMode = action.payload;
    },
    setSelectableOptionPairs: (state, action: PayloadAction<any>) => {
      state.selectableOptionPairs = action.payload;
      if (!action.payload.length) {
        state.isComboMode = false;
        state.isComboModePossible = false;
      }
    },
    resetComboMode: (state) => {
      state.isComboMode = true;
      state.isComboModePossible = true;
      state.size = "0";
      state.sizeAtComboMode = "0";
      state.riskPremium = 0;
      state.riskPremiumAtComboMode = 0;
      state.executionPrice = 0;
      state.executionPriceAtComboMode = 0;
      state.quoteAssetAmount = "0";
      state.quoteAssetAmountAtComboMode = "0";
      state.quoteAssetValue = 0;
      state.quoteAssetValueAtComboMode = 0;
      state.collateralAssetAmount = "0";
      state.collateralAssetAmountAtComboMode = "0";
      state.tradeFeeUsd = 0;
      state.tradeFeeUsdAtComboMode = 0;
    },
    setSize: (state, action: PayloadAction<any>) => {
      state.size = action.payload;
    },
    setSizeAtComboMode: (state, action: PayloadAction<any>) => {
      state.sizeAtComboMode = action.payload;
    },
    resetInput: (state) => {
      state.size = "0";
      state.sizeAtComboMode = "0";
      state.riskPremium = 0;
      state.riskPremiumAtComboMode = 0;
      state.executionPrice = 0;
      state.executionPriceAtComboMode = 0;
      state.quoteAssetAmount = "0";
      state.quoteAssetAmountAtComboMode = "0";
      state.quoteAssetValue = 0;
      state.quoteAssetValueAtComboMode = 0;
      state.collateralAssetAmount = "0";
      state.collateralAssetAmountAtComboMode = "0";
      state.tradeFeeUsd = 0;
      state.tradeFeeUsdAtComboMode = 0;
    },
    setRiskPremium: (state, action: PayloadAction<any>) => {
      state.riskPremium = action.payload;
    },
    setRiskPremiumAtComboMode: (state, action: PayloadAction<any>) => {
      state.riskPremiumAtComboMode = action.payload;
    },
    setExecutionPrice: (state, action: PayloadAction<any>) => {
      state.executionPrice = action.payload;
    },
    setExecutionPriceAtComboMode: (state, action: PayloadAction<any>) => {
      state.executionPriceAtComboMode = action.payload;
    },
    setQuoteAssetAmount: (state, action: PayloadAction<any>) => {
      const [integerPart, decimalPart] = action.payload.split(".");
      if (decimalPart) {
        state.quoteAssetAmount = `${integerPart}.${decimalPart.substring(
          0,
          6
        )}`;
      } else {
        state.quoteAssetAmount = action.payload;
      }
    },
    setQuoteAssetAmountAtComboMode: (state, action: PayloadAction<any>) => {
      const [integerPart, decimalPart] = action.payload.split(".");
      if (decimalPart) {
        state.quoteAssetAmountAtComboMode = `${integerPart}.${decimalPart.substring(
          0,
          6
        )}`;
      } else {
        state.quoteAssetAmountAtComboMode = action.payload;
      }
    },
    setQuoteAssetValue: (state, action: PayloadAction<any>) => {
      state.quoteAssetValue = action.payload;
    },
    setQuoteAssetValueAtComboMode: (state, action: PayloadAction<any>) => {
      state.quoteAssetValueAtComboMode = action.payload;
    },
    setCollateralAssetAmount: (state, action: PayloadAction<any>) => {
      state.collateralAssetAmount = action.payload;
    },
    setCollateralAssetAmountAtComboMode: (
      state,
      action: PayloadAction<any>
    ) => {
      state.collateralAssetAmountAtComboMode = action.payload;
    },
    setTradeFeeUsd: (state, action: PayloadAction<any>) => {
      state.tradeFeeUsd = action.payload;
    },
    setTradeFeeUsdAtComboMode: (state, action: PayloadAction<any>) => {
      state.tradeFeeUsdAtComboMode = action.payload;
    },
  },
});

export const {
  setPairedOption,
  resetPairedOption,
  setSelectedQuoteAsset,
  setSlippage,
  resetSlippage,
  setModalNameList,
  removeLastModalName,
  setIsComboMode,
  setSelectableOptionPairs,
  resetComboMode,
  setSize,
  setSizeAtComboMode,
  resetInput,
  setRiskPremium,
  setRiskPremiumAtComboMode,
  setExecutionPrice,
  setExecutionPriceAtComboMode,
  setQuoteAssetAmount,
  setQuoteAssetAmountAtComboMode,
  setQuoteAssetValue,
  setQuoteAssetValueAtComboMode,
  setCollateralAssetAmount,
  setCollateralAssetAmountAtComboMode,
  setTradeFeeUsd,
  setTradeFeeUsdAtComboMode,
  setIsScrollToSlippage,
} = selectedOptionSlice.actions;

export default selectedOptionSlice.reducer;
