import React from "react";

const SvgReactMock = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} {...props} />
));

export default SvgReactMock;
