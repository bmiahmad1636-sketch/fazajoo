import "./AnimatedLogo.css";

function AnimatedLogo({
  size = 180,
  className = "",
  compact = false,
}) {
  return (
    <div
      className={[
        "fazajoo-animated-logo",
        compact
          ? "fazajoo-animated-logo--compact"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--fazajoo-logo-size": `${size}px`,
      }}
      aria-label="فضاجو"
      role="img"
    >
      <div className="fazajoo-animated-logo__mark">
        <div className="fazajoo-animated-logo__frame">
          <span className="fazajoo-animated-logo__frame-top" />
          <span className="fazajoo-animated-logo__frame-side" />
        </div>

        <div className="fazajoo-animated-logo__door-wrap">
          <div className="fazajoo-animated-logo__door">
            <span className="fazajoo-animated-logo__door-shine" />
            <span className="fazajoo-animated-logo__knob" />
          </div>
        </div>

        <span className="fazajoo-animated-logo__shadow" />
      </div>

      <div className="fazajoo-animated-logo__wordmark">
        <span className="fazajoo-animated-logo__wordmark-dark">
          فضا
        </span>
        <span className="fazajoo-animated-logo__wordmark-orange">
          جو
        </span>
      </div>
    </div>
  );
}

export default AnimatedLogo;