interface CursorPagedMeta {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** BE chỉ trả page/pageSize/hasNextPage/hasPreviousPage — ước lượng totalRecords cho PrimeVue lazy table. */
export function computeLazyTableTotalRecords(
  page: number,
  pageSize: number,
  itemCount: number,
  hasNextPage: boolean
): number {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.max(1, pageSize);
  const loadedCount = (normalizedPage - 1) * normalizedPageSize + Math.max(0, itemCount);
  return hasNextPage ? loadedCount + 1 : loadedCount;
}

export function parseCursorPagedMeta(
  data: {
    page?: string | number;
    pageSize?: string | number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  } | null | undefined,
  fallbackPage: number,
  fallbackPageSize: number
): CursorPagedMeta {
  return {
    page: Number(data?.page) || fallbackPage,
    pageSize: Number(data?.pageSize) || fallbackPageSize,
    hasNextPage: Boolean(data?.hasNextPage),
    hasPreviousPage: Boolean(data?.hasPreviousPage),
  };
}

/** Chống race khi fetch list nhiều lần (đổi trang, re-enter, lazy DataTable). */
export function useListTableFetch() {
  let fetchRequestId = 0;

  const startRequest = () => ++fetchRequestId;

  const isStaleRequest = (id: number) => id !== fetchRequestId;

  const shouldSkipDuplicatePageLoad = (options: {
    eventPage: number;
    eventRows: number;
    currentPage: number;
    rowsPerPage: number;
    isLoading: boolean;
    hasData: boolean;
  }) => {
    const nextPage = options.eventPage + 1;
    if (nextPage !== options.currentPage || options.eventRows !== options.rowsPerPage) {
      return false;
    }
    return options.isLoading || options.hasData;
  };

  return { startRequest, isStaleRequest, shouldSkipDuplicatePageLoad };
}
