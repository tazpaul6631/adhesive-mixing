import { ref } from 'vue';

/** Loading overlay khi ionViewWillEnter fetch — không dùng cho paginate trong page. */
export function useViewEnterLoading() {
  const isViewEnterLoading = ref(false);

  const runWithViewEnterLoading = async (task: () => Promise<void>) => {
    isViewEnterLoading.value = true;
    try {
      await task();
    } finally {
      isViewEnterLoading.value = false;
    }
  };

  return {
    isViewEnterLoading,
    runWithViewEnterLoading,
  };
}
