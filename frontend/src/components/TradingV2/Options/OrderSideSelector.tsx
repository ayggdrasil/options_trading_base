import { OrderSide } from "@/utils/types";
import { twJoin } from "tailwind-merge";

interface OrderSideSelectorProps {
  selectedOrderSide: OrderSide;
  setSelectedOrderSide: (orderSide: OrderSide) => void;
}

function OrderSideSelector({
  selectedOrderSide,
  setSelectedOrderSide,
}: OrderSideSelectorProps) {
  const orderSides: OrderSide[] = ["Buy", "Sell"];

  return (
    <div className="flex flex-row items-center gap-[4px]">
      {orderSides.map((orderSide) => (
        <OrderSideButton
          key={orderSide}
          orderSide={orderSide}
          isSelected={orderSide === selectedOrderSide}
          setSelectedOrderSide={setSelectedOrderSide}
        />
      ))}
    </div>
  );
}

export default OrderSideSelector;

interface OrderSideButtonProps {
  orderSide: OrderSide;
  isSelected: boolean;
  setSelectedOrderSide: (orderSide: OrderSide) => void;
}

function OrderSideButton({
  orderSide,
  isSelected,
  setSelectedOrderSide,
}: OrderSideButtonProps) {
  return (
    <button
      className={twJoin(
        "cursor-pointer group flex flex-row items-center justify-center",
        "w-fit h-[36px] px-[16px] rounded-[6px]",
        "hover:bg-black292c ",
        "active:opacity-80 active:scale-95",
        isSelected && orderSide === "Buy" && "!bg-green71b8",
        isSelected && orderSide === "Sell" && "!bg-rede04a"
      )}
      onClick={() => {
        setSelectedOrderSide(orderSide);
      }}
    >
      <p
        className={twJoin(
          "text-gray8c8c text-[14px] font-[600]",
          "group-hover:text-whitef2f2",
          isSelected && "!text-black1214 !font-[700]"
        )}
      >
        {orderSide}
      </p>
    </button>
  );
}
