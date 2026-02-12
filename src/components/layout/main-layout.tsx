import { Outlet } from "react-router-dom";
import Navbar from "../common/ui/navbar";
import Sidebar from "../common/ui/sidebar";
import TopRouteLoader from "../common/ui/TopRouteLoader";

function MainLayout() {
  return (
    <div>
      <TopRouteLoader />

      <Navbar />
      <div className="flex justify-start items-start w-full dark:bg-dark-background">
        <div>
          <Sidebar />
        </div>
        <div className="w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
