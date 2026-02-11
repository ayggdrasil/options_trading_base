import { twJoin } from "tailwind-merge";
import IconArrowBackOn from "@assets/img/icon/arr-back-on.png";
import IconArrowBackOff from "@assets/img/icon/arr-back-off.png";
import IconArrowNextOn from "@assets/img/icon/arr-next-on.png";
import IconArrowNextOff from "@assets/img/icon/arr-next-off.png";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: TablePaginationProps) {
  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Calculate display range for items
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={twJoin(
        "w-full h-[40px] flex flex-row items-center justify-end gap-[12px]",
        "px-[12px] py-[8px] border-t-[1px] border-black2023"
      )}
    >
      <p className="h-[24px] text-gray8c8c text-[12px] font-[500] leading-[24px]">
        {totalItems === 0
          ? "0-0 of 0"
          : `${startItem}-${endItem} of ${totalItems}`}
      </p>
      <div className="flex flex-row items-center gap-[4px]">
        <button
          className={twJoin(
            "cursor-pointer w-[24px] h-[24px] flex items-center justify-center rounded-[6px]",
            currentPage !== 1 &&
              "hover:bg-black292c active:scale-95 active:opacity-80",
            currentPage === 1 && "!cursor-not-allowed"
          )}
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          <img
            src={currentPage === 1 ? IconArrowBackOff : IconArrowBackOn}
            alt="Previous page"
            className="w-[24px] h-[24px]"
          />
        </button>
        <button
          className={twJoin(
            "cursor-pointer w-[24px] h-[24px] flex items-center justify-center rounded-[6px]",
            currentPage !== totalPages &&
              totalPages !== 0 &&
              "hover:bg-black292c active:scale-95 active:opacity-80",
            (currentPage === totalPages || totalPages === 0) &&
              "!cursor-not-allowed"
          )}
          onClick={handleNextPage}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <img
            src={
              currentPage === totalPages || totalPages === 0
                ? IconArrowNextOff
                : IconArrowNextOn
            }
            alt="Next page"
            className="w-[24px] h-[24px]"
          />
        </button>
      </div>
    </div>
  );
}

export default TablePagination;
