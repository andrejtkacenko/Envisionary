import React, { useEffect, useState } from "react";

const Dashboard: React.FC = () => {
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

  useEffect(() => {
    const googleConnected = localStorage.getItem("google_connected") === "true";
    setIsGoogleConnected(googleConnected);
  }, []);

  return (
    <div>
      {isGoogleConnected ? "Google Connected" : "Google Not Connected"}
      {/* Other Dashboard content */}
    </div>
  );
};

export default Dashboard;