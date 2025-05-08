import {
  DefaultPropsProvider_default,
  requirePropFactory,
  useDefaultProps
} from "./chunk-WXNISSGI.js";
import {
  require_prop_types
} from "./chunk-PODQK3YP.js";
import {
  require_jsx_runtime
} from "./chunk-G7Y47P27.js";
import {
  require_react
} from "./chunk-FXJVXTVJ.js";
import {
  __toESM
} from "./chunk-4B2QHNJT.js";

// node_modules/@mui/material/utils/requirePropFactory.js
var requirePropFactory_default = requirePropFactory;

// node_modules/@mui/material/DefaultPropsProvider/DefaultPropsProvider.js
var React = __toESM(require_react());
var import_prop_types = __toESM(require_prop_types());
var import_jsx_runtime = __toESM(require_jsx_runtime());
function DefaultPropsProvider(props) {
  return (0, import_jsx_runtime.jsx)(DefaultPropsProvider_default, {
    ...props
  });
}
true ? DefaultPropsProvider.propTypes = {
  // ┌────────────────────────────── Warning ──────────────────────────────┐
  // │ These PropTypes are generated from the TypeScript type definitions. │
  // │ To update them, edit the TypeScript types and run `pnpm proptypes`. │
  // └─────────────────────────────────────────────────────────────────────┘
  /**
   * @ignore
   */
  children: import_prop_types.default.node,
  /**
   * @ignore
   */
  value: import_prop_types.default.object.isRequired
} : void 0;
function useDefaultProps2(params) {
  return useDefaultProps(params);
}

export {
  useDefaultProps2 as useDefaultProps,
  requirePropFactory_default
};
//# sourceMappingURL=chunk-FD6FWVEZ.js.map
