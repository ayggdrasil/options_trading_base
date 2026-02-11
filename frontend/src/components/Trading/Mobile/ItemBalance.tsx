const ItemBalance = ({ data }: any) => {
  return (
    <div className="flex justify-between items-center w-full h-[38px]">
      <div className="flex gap-4">
        <img src={data.icon} alt="iconCoin" />
        <div>
          <h2 className="font-medium text-[15px] md:text-[17px] text-contentBright leading-[18px]">
            {data.coinName}
          </h2>
          <p className="font-medium text-[13px] md:text-[15px] text-gray9D leading-4">
            {data.code}
          </p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="font-medium text-[15px] md:text-[17px] text-contentBright leading-[18px]">
          {data.quantity}
        </h2>
        <p className="font-medium text-[13px] md:text-[15px] text-gray9D leading-4">
          {data.cost}
        </p>
      </div>
    </div>
  );
};

export default ItemBalance;
