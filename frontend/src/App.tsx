import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MapPage from "./pages/MapPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MapPage />
    </QueryClientProvider>
  );
}

export default App;
