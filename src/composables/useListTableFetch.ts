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
