"use client";
import "./CommingSoonWrapper.css";
import { FiClock, FiZap, FiStar } from "react-icons/fi";

const CommingSoonWrapper = () => {
  return (
    <div className="comingsoon-wrapper">
      <div className="comingsoon-card">
        <div className="comingsoon-glow"></div>

        <h1 className="comingsoon-title">
          <FiZap className="comingsoon-title-icon" />
          Coming Soon
        </h1>

        <p className="comingsoon-text">
          We're crafting something powerful and exciting.  
          This feature is under development — stay tuned!
        </p>

        <div className="comingsoon-icons">
          <FiClock className="soon-icon" />
          <FiStar className="soon-icon" />
          <FiZap className="soon-icon" />
        </div>

        <p className="comingsoon-subtext">
          Smart tools & new features are arriving shortly.
        </p>
      </div>
    </div>
  );
};

export default CommingSoonWrapper;
