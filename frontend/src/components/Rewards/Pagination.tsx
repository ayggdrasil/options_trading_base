import { twJoin } from 'tailwind-merge'

import PageLeftIcon from '@/assets/page-left.svg'
import PageRightIcon from '@/assets/page-right.svg'

type Props = {
  itemsPerPage: number
  totalCount: number
  page: number
  setPage: (page: number) => void
}

const Pagination = ({ itemsPerPage, totalCount, page, setPage }: Props) => {

  const hasNextPage = page < Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="w-full px-[20px] mt-auto">
      <div className="flex justify-between items-center">
        <div
          className={twJoin(
            "flex items-center",
            "text-[14px] font-semibold text-gray80",
            "cursor-pointer",
            page == 1 && "invisible"
          )}
          onClick={() => {
            if (page == 1) return
            setPage(page - 1)
          }}
        >
          <img className="" src={PageLeftIcon} />
          <span>{(itemsPerPage * (page - 2)) + 1}-{(itemsPerPage * (page - 1))}</span>
        </div>
        <div
          className={twJoin(
            "flex items-center",
            "text-[14px] font-semibold text-gray80",
            "cursor-pointer",
            hasNextPage ? "" : "invisible"
          )}
          onClick={() => {
            if (!hasNextPage) return
            setPage(page + 1)
          }}
        >
          <span>{(itemsPerPage * (page)) + 1}-{(itemsPerPage * (page + 1))}</span>
          <img className="" src={PageRightIcon} />
        </div>
      </div>
    </div>
  )
}

export default Pagination