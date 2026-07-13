"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["assets_controllers_csrf_protection_controller_js"],{

/***/ "./assets/controllers/csrf_protection_controller.js"
/*!**********************************************************!*\
  !*** ./assets/controllers/csrf_protection_controller.js ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   generateCsrfHeaders: () => (/* binding */ generateCsrfHeaders),
/* harmony export */   generateCsrfToken: () => (/* binding */ generateCsrfToken),
/* harmony export */   removeCsrfToken: () => (/* binding */ removeCsrfToken)
/* harmony export */ });
/* harmony import */ var core_js_modules_es_error_to_string_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! core-js/modules/es.error.to-string.js */ "./node_modules/core-js/modules/es.error.to-string.js");
/* harmony import */ var core_js_modules_es_error_to_string_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_error_to_string_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var core_js_modules_es_array_iterator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! core-js/modules/es.array.iterator.js */ "./node_modules/core-js/modules/es.array.iterator.js");
/* harmony import */ var core_js_modules_es_array_iterator_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_iterator_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var core_js_modules_es_array_map_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! core-js/modules/es.array.map.js */ "./node_modules/core-js/modules/es.array.map.js");
/* harmony import */ var core_js_modules_es_array_map_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_map_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var core_js_modules_es_array_buffer_constructor_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! core-js/modules/es.array-buffer.constructor.js */ "./node_modules/core-js/modules/es.array-buffer.constructor.js");
/* harmony import */ var core_js_modules_es_array_buffer_constructor_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_buffer_constructor_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var core_js_modules_es_array_buffer_slice_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! core-js/modules/es.array-buffer.slice.js */ "./node_modules/core-js/modules/es.array-buffer.slice.js");
/* harmony import */ var core_js_modules_es_array_buffer_slice_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_buffer_slice_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var core_js_modules_es_data_view_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! core-js/modules/es.data-view.js */ "./node_modules/core-js/modules/es.data-view.js");
/* harmony import */ var core_js_modules_es_data_view_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_data_view_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var core_js_modules_es_array_buffer_detached_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! core-js/modules/es.array-buffer.detached.js */ "./node_modules/core-js/modules/es.array-buffer.detached.js");
/* harmony import */ var core_js_modules_es_array_buffer_detached_js__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_buffer_detached_js__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var core_js_modules_es_array_buffer_transfer_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! core-js/modules/es.array-buffer.transfer.js */ "./node_modules/core-js/modules/es.array-buffer.transfer.js");
/* harmony import */ var core_js_modules_es_array_buffer_transfer_js__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_buffer_transfer_js__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var core_js_modules_es_array_buffer_transfer_to_fixed_length_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! core-js/modules/es.array-buffer.transfer-to-fixed-length.js */ "./node_modules/core-js/modules/es.array-buffer.transfer-to-fixed-length.js");
/* harmony import */ var core_js_modules_es_array_buffer_transfer_to_fixed_length_js__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_array_buffer_transfer_to_fixed_length_js__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var core_js_modules_es_object_keys_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! core-js/modules/es.object.keys.js */ "./node_modules/core-js/modules/es.object.keys.js");
/* harmony import */ var core_js_modules_es_object_keys_js__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_object_keys_js__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var core_js_modules_es_object_to_string_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! core-js/modules/es.object.to-string.js */ "./node_modules/core-js/modules/es.object.to-string.js");
/* harmony import */ var core_js_modules_es_object_to_string_js__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_object_to_string_js__WEBPACK_IMPORTED_MODULE_10__);
/* harmony import */ var core_js_modules_es_regexp_exec_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! core-js/modules/es.regexp.exec.js */ "./node_modules/core-js/modules/es.regexp.exec.js");
/* harmony import */ var core_js_modules_es_regexp_exec_js__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_regexp_exec_js__WEBPACK_IMPORTED_MODULE_11__);
/* harmony import */ var core_js_modules_es_regexp_test_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! core-js/modules/es.regexp.test.js */ "./node_modules/core-js/modules/es.regexp.test.js");
/* harmony import */ var core_js_modules_es_regexp_test_js__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_regexp_test_js__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var core_js_modules_es_typed_array_uint8_array_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! core-js/modules/es.typed-array.uint8-array.js */ "./node_modules/core-js/modules/es.typed-array.uint8-array.js");
/* harmony import */ var core_js_modules_es_typed_array_uint8_array_js__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_uint8_array_js__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var core_js_modules_es_typed_array_at_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! core-js/modules/es.typed-array.at.js */ "./node_modules/core-js/modules/es.typed-array.at.js");
/* harmony import */ var core_js_modules_es_typed_array_at_js__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_at_js__WEBPACK_IMPORTED_MODULE_14__);
/* harmony import */ var core_js_modules_es_typed_array_copy_within_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! core-js/modules/es.typed-array.copy-within.js */ "./node_modules/core-js/modules/es.typed-array.copy-within.js");
/* harmony import */ var core_js_modules_es_typed_array_copy_within_js__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_copy_within_js__WEBPACK_IMPORTED_MODULE_15__);
/* harmony import */ var core_js_modules_es_typed_array_every_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! core-js/modules/es.typed-array.every.js */ "./node_modules/core-js/modules/es.typed-array.every.js");
/* harmony import */ var core_js_modules_es_typed_array_every_js__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_every_js__WEBPACK_IMPORTED_MODULE_16__);
/* harmony import */ var core_js_modules_es_typed_array_fill_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! core-js/modules/es.typed-array.fill.js */ "./node_modules/core-js/modules/es.typed-array.fill.js");
/* harmony import */ var core_js_modules_es_typed_array_fill_js__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_fill_js__WEBPACK_IMPORTED_MODULE_17__);
/* harmony import */ var core_js_modules_es_typed_array_filter_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! core-js/modules/es.typed-array.filter.js */ "./node_modules/core-js/modules/es.typed-array.filter.js");
/* harmony import */ var core_js_modules_es_typed_array_filter_js__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_filter_js__WEBPACK_IMPORTED_MODULE_18__);
/* harmony import */ var core_js_modules_es_typed_array_find_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! core-js/modules/es.typed-array.find.js */ "./node_modules/core-js/modules/es.typed-array.find.js");
/* harmony import */ var core_js_modules_es_typed_array_find_js__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_find_js__WEBPACK_IMPORTED_MODULE_19__);
/* harmony import */ var core_js_modules_es_typed_array_find_index_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! core-js/modules/es.typed-array.find-index.js */ "./node_modules/core-js/modules/es.typed-array.find-index.js");
/* harmony import */ var core_js_modules_es_typed_array_find_index_js__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_find_index_js__WEBPACK_IMPORTED_MODULE_20__);
/* harmony import */ var core_js_modules_es_typed_array_find_last_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! core-js/modules/es.typed-array.find-last.js */ "./node_modules/core-js/modules/es.typed-array.find-last.js");
/* harmony import */ var core_js_modules_es_typed_array_find_last_js__WEBPACK_IMPORTED_MODULE_21___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_find_last_js__WEBPACK_IMPORTED_MODULE_21__);
/* harmony import */ var core_js_modules_es_typed_array_find_last_index_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! core-js/modules/es.typed-array.find-last-index.js */ "./node_modules/core-js/modules/es.typed-array.find-last-index.js");
/* harmony import */ var core_js_modules_es_typed_array_find_last_index_js__WEBPACK_IMPORTED_MODULE_22___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_find_last_index_js__WEBPACK_IMPORTED_MODULE_22__);
/* harmony import */ var core_js_modules_es_typed_array_for_each_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! core-js/modules/es.typed-array.for-each.js */ "./node_modules/core-js/modules/es.typed-array.for-each.js");
/* harmony import */ var core_js_modules_es_typed_array_for_each_js__WEBPACK_IMPORTED_MODULE_23___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_for_each_js__WEBPACK_IMPORTED_MODULE_23__);
/* harmony import */ var core_js_modules_es_typed_array_includes_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! core-js/modules/es.typed-array.includes.js */ "./node_modules/core-js/modules/es.typed-array.includes.js");
/* harmony import */ var core_js_modules_es_typed_array_includes_js__WEBPACK_IMPORTED_MODULE_24___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_includes_js__WEBPACK_IMPORTED_MODULE_24__);
/* harmony import */ var core_js_modules_es_typed_array_index_of_js__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! core-js/modules/es.typed-array.index-of.js */ "./node_modules/core-js/modules/es.typed-array.index-of.js");
/* harmony import */ var core_js_modules_es_typed_array_index_of_js__WEBPACK_IMPORTED_MODULE_25___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_index_of_js__WEBPACK_IMPORTED_MODULE_25__);
/* harmony import */ var core_js_modules_es_typed_array_iterator_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! core-js/modules/es.typed-array.iterator.js */ "./node_modules/core-js/modules/es.typed-array.iterator.js");
/* harmony import */ var core_js_modules_es_typed_array_iterator_js__WEBPACK_IMPORTED_MODULE_26___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_iterator_js__WEBPACK_IMPORTED_MODULE_26__);
/* harmony import */ var core_js_modules_es_typed_array_join_js__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! core-js/modules/es.typed-array.join.js */ "./node_modules/core-js/modules/es.typed-array.join.js");
/* harmony import */ var core_js_modules_es_typed_array_join_js__WEBPACK_IMPORTED_MODULE_27___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_join_js__WEBPACK_IMPORTED_MODULE_27__);
/* harmony import */ var core_js_modules_es_typed_array_last_index_of_js__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! core-js/modules/es.typed-array.last-index-of.js */ "./node_modules/core-js/modules/es.typed-array.last-index-of.js");
/* harmony import */ var core_js_modules_es_typed_array_last_index_of_js__WEBPACK_IMPORTED_MODULE_28___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_last_index_of_js__WEBPACK_IMPORTED_MODULE_28__);
/* harmony import */ var core_js_modules_es_typed_array_map_js__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! core-js/modules/es.typed-array.map.js */ "./node_modules/core-js/modules/es.typed-array.map.js");
/* harmony import */ var core_js_modules_es_typed_array_map_js__WEBPACK_IMPORTED_MODULE_29___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_map_js__WEBPACK_IMPORTED_MODULE_29__);
/* harmony import */ var core_js_modules_es_typed_array_reduce_js__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! core-js/modules/es.typed-array.reduce.js */ "./node_modules/core-js/modules/es.typed-array.reduce.js");
/* harmony import */ var core_js_modules_es_typed_array_reduce_js__WEBPACK_IMPORTED_MODULE_30___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_reduce_js__WEBPACK_IMPORTED_MODULE_30__);
/* harmony import */ var core_js_modules_es_typed_array_reduce_right_js__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! core-js/modules/es.typed-array.reduce-right.js */ "./node_modules/core-js/modules/es.typed-array.reduce-right.js");
/* harmony import */ var core_js_modules_es_typed_array_reduce_right_js__WEBPACK_IMPORTED_MODULE_31___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_reduce_right_js__WEBPACK_IMPORTED_MODULE_31__);
/* harmony import */ var core_js_modules_es_typed_array_reverse_js__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! core-js/modules/es.typed-array.reverse.js */ "./node_modules/core-js/modules/es.typed-array.reverse.js");
/* harmony import */ var core_js_modules_es_typed_array_reverse_js__WEBPACK_IMPORTED_MODULE_32___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_reverse_js__WEBPACK_IMPORTED_MODULE_32__);
/* harmony import */ var core_js_modules_es_typed_array_set_js__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(/*! core-js/modules/es.typed-array.set.js */ "./node_modules/core-js/modules/es.typed-array.set.js");
/* harmony import */ var core_js_modules_es_typed_array_set_js__WEBPACK_IMPORTED_MODULE_33___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_set_js__WEBPACK_IMPORTED_MODULE_33__);
/* harmony import */ var core_js_modules_es_typed_array_slice_js__WEBPACK_IMPORTED_MODULE_34__ = __webpack_require__(/*! core-js/modules/es.typed-array.slice.js */ "./node_modules/core-js/modules/es.typed-array.slice.js");
/* harmony import */ var core_js_modules_es_typed_array_slice_js__WEBPACK_IMPORTED_MODULE_34___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_slice_js__WEBPACK_IMPORTED_MODULE_34__);
/* harmony import */ var core_js_modules_es_typed_array_some_js__WEBPACK_IMPORTED_MODULE_35__ = __webpack_require__(/*! core-js/modules/es.typed-array.some.js */ "./node_modules/core-js/modules/es.typed-array.some.js");
/* harmony import */ var core_js_modules_es_typed_array_some_js__WEBPACK_IMPORTED_MODULE_35___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_some_js__WEBPACK_IMPORTED_MODULE_35__);
/* harmony import */ var core_js_modules_es_typed_array_sort_js__WEBPACK_IMPORTED_MODULE_36__ = __webpack_require__(/*! core-js/modules/es.typed-array.sort.js */ "./node_modules/core-js/modules/es.typed-array.sort.js");
/* harmony import */ var core_js_modules_es_typed_array_sort_js__WEBPACK_IMPORTED_MODULE_36___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_sort_js__WEBPACK_IMPORTED_MODULE_36__);
/* harmony import */ var core_js_modules_es_typed_array_subarray_js__WEBPACK_IMPORTED_MODULE_37__ = __webpack_require__(/*! core-js/modules/es.typed-array.subarray.js */ "./node_modules/core-js/modules/es.typed-array.subarray.js");
/* harmony import */ var core_js_modules_es_typed_array_subarray_js__WEBPACK_IMPORTED_MODULE_37___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_subarray_js__WEBPACK_IMPORTED_MODULE_37__);
/* harmony import */ var core_js_modules_es_typed_array_to_locale_string_js__WEBPACK_IMPORTED_MODULE_38__ = __webpack_require__(/*! core-js/modules/es.typed-array.to-locale-string.js */ "./node_modules/core-js/modules/es.typed-array.to-locale-string.js");
/* harmony import */ var core_js_modules_es_typed_array_to_locale_string_js__WEBPACK_IMPORTED_MODULE_38___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_to_locale_string_js__WEBPACK_IMPORTED_MODULE_38__);
/* harmony import */ var core_js_modules_es_typed_array_to_reversed_js__WEBPACK_IMPORTED_MODULE_39__ = __webpack_require__(/*! core-js/modules/es.typed-array.to-reversed.js */ "./node_modules/core-js/modules/es.typed-array.to-reversed.js");
/* harmony import */ var core_js_modules_es_typed_array_to_reversed_js__WEBPACK_IMPORTED_MODULE_39___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_to_reversed_js__WEBPACK_IMPORTED_MODULE_39__);
/* harmony import */ var core_js_modules_es_typed_array_to_sorted_js__WEBPACK_IMPORTED_MODULE_40__ = __webpack_require__(/*! core-js/modules/es.typed-array.to-sorted.js */ "./node_modules/core-js/modules/es.typed-array.to-sorted.js");
/* harmony import */ var core_js_modules_es_typed_array_to_sorted_js__WEBPACK_IMPORTED_MODULE_40___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_to_sorted_js__WEBPACK_IMPORTED_MODULE_40__);
/* harmony import */ var core_js_modules_es_typed_array_to_string_js__WEBPACK_IMPORTED_MODULE_41__ = __webpack_require__(/*! core-js/modules/es.typed-array.to-string.js */ "./node_modules/core-js/modules/es.typed-array.to-string.js");
/* harmony import */ var core_js_modules_es_typed_array_to_string_js__WEBPACK_IMPORTED_MODULE_41___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_to_string_js__WEBPACK_IMPORTED_MODULE_41__);
/* harmony import */ var core_js_modules_es_typed_array_with_js__WEBPACK_IMPORTED_MODULE_42__ = __webpack_require__(/*! core-js/modules/es.typed-array.with.js */ "./node_modules/core-js/modules/es.typed-array.with.js");
/* harmony import */ var core_js_modules_es_typed_array_with_js__WEBPACK_IMPORTED_MODULE_42___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_typed_array_with_js__WEBPACK_IMPORTED_MODULE_42__);
/* harmony import */ var core_js_modules_esnext_iterator_constructor_js__WEBPACK_IMPORTED_MODULE_43__ = __webpack_require__(/*! core-js/modules/esnext.iterator.constructor.js */ "./node_modules/core-js/modules/esnext.iterator.constructor.js");
/* harmony import */ var core_js_modules_esnext_iterator_constructor_js__WEBPACK_IMPORTED_MODULE_43___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_esnext_iterator_constructor_js__WEBPACK_IMPORTED_MODULE_43__);
/* harmony import */ var core_js_modules_esnext_iterator_map_js__WEBPACK_IMPORTED_MODULE_44__ = __webpack_require__(/*! core-js/modules/esnext.iterator.map.js */ "./node_modules/core-js/modules/esnext.iterator.map.js");
/* harmony import */ var core_js_modules_esnext_iterator_map_js__WEBPACK_IMPORTED_MODULE_44___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_esnext_iterator_map_js__WEBPACK_IMPORTED_MODULE_44__);
/* harmony import */ var core_js_modules_esnext_uint8_array_set_from_base64_js__WEBPACK_IMPORTED_MODULE_45__ = __webpack_require__(/*! core-js/modules/esnext.uint8-array.set-from-base64.js */ "./node_modules/core-js/modules/esnext.uint8-array.set-from-base64.js");
/* harmony import */ var core_js_modules_esnext_uint8_array_set_from_base64_js__WEBPACK_IMPORTED_MODULE_45___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_esnext_uint8_array_set_from_base64_js__WEBPACK_IMPORTED_MODULE_45__);
/* harmony import */ var core_js_modules_esnext_uint8_array_set_from_hex_js__WEBPACK_IMPORTED_MODULE_46__ = __webpack_require__(/*! core-js/modules/esnext.uint8-array.set-from-hex.js */ "./node_modules/core-js/modules/esnext.uint8-array.set-from-hex.js");
/* harmony import */ var core_js_modules_esnext_uint8_array_set_from_hex_js__WEBPACK_IMPORTED_MODULE_46___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_esnext_uint8_array_set_from_hex_js__WEBPACK_IMPORTED_MODULE_46__);
/* harmony import */ var core_js_modules_esnext_uint8_array_to_base64_js__WEBPACK_IMPORTED_MODULE_47__ = __webpack_require__(/*! core-js/modules/esnext.uint8-array.to-base64.js */ "./node_modules/core-js/modules/esnext.uint8-array.to-base64.js");
/* harmony import */ var core_js_modules_esnext_uint8_array_to_base64_js__WEBPACK_IMPORTED_MODULE_47___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_esnext_uint8_array_to_base64_js__WEBPACK_IMPORTED_MODULE_47__);
/* harmony import */ var core_js_modules_esnext_uint8_array_to_hex_js__WEBPACK_IMPORTED_MODULE_48__ = __webpack_require__(/*! core-js/modules/esnext.uint8-array.to-hex.js */ "./node_modules/core-js/modules/esnext.uint8-array.to-hex.js");
/* harmony import */ var core_js_modules_esnext_uint8_array_to_hex_js__WEBPACK_IMPORTED_MODULE_48___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_esnext_uint8_array_to_hex_js__WEBPACK_IMPORTED_MODULE_48__);
/* harmony import */ var core_js_modules_web_btoa_js__WEBPACK_IMPORTED_MODULE_49__ = __webpack_require__(/*! core-js/modules/web.btoa.js */ "./node_modules/core-js/modules/web.btoa.js");
/* harmony import */ var core_js_modules_web_btoa_js__WEBPACK_IMPORTED_MODULE_49___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_web_btoa_js__WEBPACK_IMPORTED_MODULE_49__);
/* harmony import */ var core_js_modules_web_dom_exception_constructor_js__WEBPACK_IMPORTED_MODULE_50__ = __webpack_require__(/*! core-js/modules/web.dom-exception.constructor.js */ "./node_modules/core-js/modules/web.dom-exception.constructor.js");
/* harmony import */ var core_js_modules_web_dom_exception_constructor_js__WEBPACK_IMPORTED_MODULE_50___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_web_dom_exception_constructor_js__WEBPACK_IMPORTED_MODULE_50__);
/* harmony import */ var core_js_modules_web_dom_exception_stack_js__WEBPACK_IMPORTED_MODULE_51__ = __webpack_require__(/*! core-js/modules/web.dom-exception.stack.js */ "./node_modules/core-js/modules/web.dom-exception.stack.js");
/* harmony import */ var core_js_modules_web_dom_exception_stack_js__WEBPACK_IMPORTED_MODULE_51___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_web_dom_exception_stack_js__WEBPACK_IMPORTED_MODULE_51__);
/* harmony import */ var core_js_modules_web_dom_exception_to_string_tag_js__WEBPACK_IMPORTED_MODULE_52__ = __webpack_require__(/*! core-js/modules/web.dom-exception.to-string-tag.js */ "./node_modules/core-js/modules/web.dom-exception.to-string-tag.js");
/* harmony import */ var core_js_modules_web_dom_exception_to_string_tag_js__WEBPACK_IMPORTED_MODULE_52___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_web_dom_exception_to_string_tag_js__WEBPACK_IMPORTED_MODULE_52__);





















































var nameCheck = /^[-_a-zA-Z0-9]{4,22}$/;
var tokenCheck = /^[-_/+a-zA-Z0-9]{24,}$/;

// Generate and double-submit a CSRF token in a form field and a cookie, as defined by Symfony's SameOriginCsrfTokenManager
// Use `form.requestSubmit()` to ensure that the submit event is triggered. Using `form.submit()` will not trigger the event
// and thus this event-listener will not be executed.
document.addEventListener('submit', function (event) {
  generateCsrfToken(event.target);
}, true);

// When @hotwired/turbo handles form submissions, send the CSRF token in a header in addition to a cookie
// The `framework.csrf_protection.check_header` config option needs to be enabled for the header to be checked
document.addEventListener('turbo:submit-start', function (event) {
  var h = generateCsrfHeaders(event.detail.formSubmission.formElement);
  Object.keys(h).map(function (k) {
    event.detail.formSubmission.fetchRequest.headers[k] = h[k];
  });
});

// When @hotwired/turbo handles form submissions, remove the CSRF cookie once a form has been submitted
document.addEventListener('turbo:submit-end', function (event) {
  removeCsrfToken(event.detail.formSubmission.formElement);
});
function generateCsrfToken(formElement) {
  var csrfField = formElement.querySelector('input[data-controller="csrf-protection"], input[name="_csrf_token"]');
  if (!csrfField) {
    return;
  }
  var csrfCookie = csrfField.getAttribute('data-csrf-protection-cookie-value');
  var csrfToken = csrfField.value;
  if (!csrfCookie && nameCheck.test(csrfToken)) {
    csrfField.setAttribute('data-csrf-protection-cookie-value', csrfCookie = csrfToken);
    csrfField.defaultValue = csrfToken = btoa(String.fromCharCode.apply(null, (window.crypto || window.msCrypto).getRandomValues(new Uint8Array(18))));
  }
  csrfField.dispatchEvent(new Event('change', {
    bubbles: true
  }));
  if (csrfCookie && tokenCheck.test(csrfToken)) {
    var cookie = csrfCookie + '_' + csrfToken + '=' + csrfCookie + '; path=/; samesite=strict';
    document.cookie = window.location.protocol === 'https:' ? '__Host-' + cookie + '; secure' : cookie;
  }
}
function generateCsrfHeaders(formElement) {
  var headers = {};
  var csrfField = formElement.querySelector('input[data-controller="csrf-protection"], input[name="_csrf_token"]');
  if (!csrfField) {
    return headers;
  }
  var csrfCookie = csrfField.getAttribute('data-csrf-protection-cookie-value');
  if (tokenCheck.test(csrfField.value) && nameCheck.test(csrfCookie)) {
    headers[csrfCookie] = csrfField.value;
  }
  return headers;
}
function removeCsrfToken(formElement) {
  var csrfField = formElement.querySelector('input[data-controller="csrf-protection"], input[name="_csrf_token"]');
  if (!csrfField) {
    return;
  }
  var csrfCookie = csrfField.getAttribute('data-csrf-protection-cookie-value');
  if (tokenCheck.test(csrfField.value) && nameCheck.test(csrfCookie)) {
    var cookie = csrfCookie + '_' + csrfField.value + '=0; path=/; samesite=strict; max-age=0';
    document.cookie = window.location.protocol === 'https:' ? '__Host-' + cookie + '; secure' : cookie;
  }
}

/* stimulusFetch: 'lazy' */
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ('csrf-protection-controller');

/***/ }

}]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzX2NvbnRyb2xsZXJzX2NzcmZfcHJvdGVjdGlvbl9jb250cm9sbGVyX2pzLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFNQSxTQUFTLEdBQUcsdUJBQXVCO0FBQ3pDLElBQU1DLFVBQVUsR0FBRyx3QkFBd0I7O0FBRTNDO0FBQ0E7QUFDQTtBQUNBQyxRQUFRLENBQUNDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVQyxLQUFLLEVBQUU7RUFDakRDLGlCQUFpQixDQUFDRCxLQUFLLENBQUNFLE1BQU0sQ0FBQztBQUNuQyxDQUFDLEVBQUUsSUFBSSxDQUFDOztBQUVSO0FBQ0E7QUFDQUosUUFBUSxDQUFDQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVQyxLQUFLLEVBQUU7RUFDN0QsSUFBTUcsQ0FBQyxHQUFHQyxtQkFBbUIsQ0FBQ0osS0FBSyxDQUFDSyxNQUFNLENBQUNDLGNBQWMsQ0FBQ0MsV0FBVyxDQUFDO0VBQ3RFQyxNQUFNLENBQUNDLElBQUksQ0FBQ04sQ0FBQyxDQUFDLENBQUNPLEdBQUcsQ0FBQyxVQUFVQyxDQUFDLEVBQUU7SUFDNUJYLEtBQUssQ0FBQ0ssTUFBTSxDQUFDQyxjQUFjLENBQUNNLFlBQVksQ0FBQ0MsT0FBTyxDQUFDRixDQUFDLENBQUMsR0FBR1IsQ0FBQyxDQUFDUSxDQUFDLENBQUM7RUFDOUQsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDOztBQUVGO0FBQ0FiLFFBQVEsQ0FBQ0MsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsVUFBVUMsS0FBSyxFQUFFO0VBQzNEYyxlQUFlLENBQUNkLEtBQUssQ0FBQ0ssTUFB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QUdGLE1BQU0sR0FBRyxVQUFVLEdBQUdBLE1BQU07RUFDdEc7QUFDSjs7QUFFQTtBQUNBLGlFQUFlLDRCQUE0QixFIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vYXNzZXRzL2NvbnRyb2xsZXJzL2NzcmZfcHJvdGVjdGlvbl9jb250cm9sbGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IG5hbWVDaGVjayA9IC9eWy1fYS16QS1aMC05XXs0LDIyfSQvO1xuY29uc3QgdG9rZW5DaGVjayA9IC9eWy1fLythLXpBLVowLTldezI0LH0kLztcblxuLy8gR2VuZXJhdGUgYW5kIGRvdWJsZS1zdWJtaXQgYSBDU1JGIHRva2VuIGluIGEgZm9ybSBmaWVsZCBhbmQgYSBjb29raWUsIGFzIGRlZmluZWQgYnkgU3ltZm9ueSdzIFNhbWVPcmlnaW5Dc3JmVG9rZW5NYW5hZ2VyXG4vLyBVc2UgYGZvcm0ucmVxdWVzdFN1Ym1pdCgpYCB0byBlbnN1cmUgdGhhdCB0aGUgc3VibWl0IGV2ZW50IGlzIHRyaWdnZXJlZC4gVXNpbmcgYGZvcm0uc3VibWl0KClgIHdpbGwgbm90IHRyaWdnZXIgdGhlIGV2ZW50XG4vLyBhbmQgdGh1cyB0aGlzIGV2ZW50LWxpc3RlbmVyIHdpbGwgbm90IGJlIGV4ZWN1dGVkLlxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZ2VuZXJhdGVDc3JmVG9rZW4oZXZlbnQudGFyZ2V0KTtcbn0sIHRydWUpO1xuXG4vLyBXaGVuIEBob3R3aXJlZC90dXJibyBoYW5kbGVzIGZvcm0gc3VibWlzc2lvbnMsIHNlbmQgdGhlIENTUkYgdG9rZW4gaW4gYSBoZWFkZXIgaW4gYWRkaXRpb24gdG8gYSBjb29raWVcbi8vIFRoZSBgZnJhbWV3b3JrLmNzcmZfcHJvdGVjdGlvbi5jaGVja19oZWFkZXJgIGNvbmZpZyBvcHRpb24gbmVlZHMgdG8gYmUgZW5hYmxlZCBmb3IgdGhlIGhlYWRlciB0byBiZSBjaGVja2VkXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0dXJibzpzdWJtaXQtc3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBjb25zdCBoID0gZ2VuZXJhdGVDc3JmSGVhZGVycyhldmVudC5kZXRhaWwuZm9ybVN1Ym1pc3Npb24uZm9ybUVsZW1lbnQpO1xuICAgIE9iamVjdC5rZXlzKGgpLm1hcChmdW5jdGlvbiAoaykge1xuICAgICAgICBldmVudC5kZXRhaWwuZm9ybVN1Ym1pc3Npb24uZmV0Y2hSZXF1ZXN0LmhlYWRlcnNba10gPSBoW2tdO1xuICAgIH0pO1xufSk7XG5cbi8vIFdoZW4gQGhvdHdpcmVkL3R1cmJvIGhhbmRsZXMgZm9ybSBzdWJtaXNzaW9ucywgcmVtb3ZlIHRoZSBDU1JGIGNvb2tpZSBvbmNlIGEgZm9ybSBoYXMgYmVlbiBzdWJtaXR0ZWRcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3R1cmJvOnN1Ym1pdC1lbmQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICByZW1vdmVDc3JmVG9rZW4oZXZlbnQuZGV0YWlsLmZvcm1TdWJtaXNzaW9uLmZvcm1FbGVtZW50KTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDc3JmVG9rZW4gKGZvcm1FbGVtZW50KSB7XG4gICAgY29uc3QgY3NyZkZpZWxkID0gZm9ybUVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbZGF0YS1jb250cm9sbGVyPVwiY3NyZi1wcm90ZWN0aW9uXCJdLCBpbnB1dFtuYW1lPVwiX2NzcmZfdG9rZW5cIl0nKTtcblxuICAgIGlmICghY3NyZkZpZWxkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgY3NyZkNvb2tpZSA9IGNzcmZGaWVsZC5nZXRBdHRyaWJ1dGUoJ2RhdGEtY3NyZi1wcm90ZWN0aW9uLWNvb2tpZS12YWx1ZScpO1xuICAgIGxldCBjc3JmVG9rZW4gPSBjc3JmRmllbGQudmFsdWU7XG5cbiAgICBpZiAoIWNzcmZDb29raWUgJiYgbmFtZUNoZWNrLnRlc3QoY3NyZlRva2VuKSkge1xuICAgICAgICBjc3JmRmllbGQuc2V0QXR0cmlidXRlKCdkYXRhLWNzcmYtcHJvdGVjdGlvbi1jb29raWUtdmFsdWUnLCBjc3JmQ29va2llID0gY3NyZlRva2VuKTtcbiAgICAgICAgY3NyZkZpZWxkLmRlZmF1bHRWYWx1ZSA9IGNzcmZUb2tlbiA9IGJ0b2EoU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCAod2luZG93LmNyeXB0byB8fCB3aW5kb3cubXNDcnlwdG8pLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSgxOCkpKSk7XG4gICAgfVxuICAgIGNzcmZGaWVsZC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTtcblxuICAgIGlmIChjc3JmQ29va2llICYmIHRva2VuQ2hlY2sudGVzdChjc3JmVG9rZW4pKSB7XG4gICAgICAgIGNvbnN0IGNvb2tpZSA9IGNzcmZDb29raWUgKyAnXycgKyBjc3JmVG9rZW4gKyAnPScgKyBjc3JmQ29va2llICsgJzsgcGF0aD0vOyBzYW1lc2l0ZT1zdHJpY3QnO1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonID8gJ19fSG9zdC0nICsgY29va2llICsgJzsgc2VjdXJlJyA6IGNvb2tpZTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNzcmZIZWFkZXJzIChmb3JtRWxlbWVudCkge1xuICAgIGNvbnN0IGhlYWRlcnMgPSB7fTtcbiAgICBjb25zdCBjc3JmRmllbGQgPSBmb3JtRWxlbWVudC5xdWVyeVNlbGVjdG9yKCdpbnB1dFtkYXRhLWNvbnRyb2xsZXI9XCJjc3JmLXByb3RlY3Rpb25cIl0sIGlucHV0W25hbWU9XCJfY3NyZl90b2tlblwiXScpO1xuXG4gICAgaWYgKCFjc3JmRmllbGQpIHtcbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgfVxuXG4gICAgY29uc3QgY3NyZkNvb2tpZSA9IGNzcmZGaWVsZC5nZXRBdHRyaWJ1dGUoJ2RhdGEtY3NyZi1wcm90ZWN0aW9uLWNvb2tpZS12YWx1ZScpO1xuXG4gICAgaWYgKHRva2VuQ2hlY2sudGVzdChjc3JmRmllbGQudmFsdWUpICYmIG5hbWVDaGVjay50ZXN0KGNzcmZDb29raWUpKSB7XG4gICAgICAgIGhlYWRlcnNbY3NyZkNvb2tpZV0gPSBjc3JmRmllbGQudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDc3JmVG9rZW4gKGZvcm1FbGVtZW50KSB7XG4gICAgY29uc3QgY3NyZkZpZWxkID0gZm9ybUVsZW1lbnQucXVlcnlTZWxlY3RvcignaW5wdXRbZGF0YS1jb250cm9sbGVyPVwiY3NyZi1wcm90ZWN0aW9uXCJdLCBpbnB1dFtuYW1lPVwiX2NzcmZfdG9rZW5cIl0nKTtcblxuICAgIGlmICghY3NyZkZpZWxkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjc3JmQ29va2llID0gY3NyZkZpZWxkLmdldEF0dHJpYnV0ZSgnZGF0YS1jc3JmLXByb3RlY3Rpb24tY29va2llLXZhbHVlJyk7XG5cbiAgICBpZiAodG9rZW5DaGVjay50ZXN0KGNzcmZGaWVsZC52YWx1ZSkgJiYgbmFtZUNoZWNrLnRlc3QoY3NyZkNvb2tpZSkpIHtcbiAgICAgICAgY29uc3QgY29va2llID0gY3NyZkNvb2tpZSArICdfJyArIGNzcmZGaWVsZC52YWx1ZSArICc9MDsgcGF0aD0vOyBzYW1lc2l0ZT1zdHJpY3Q7IG1heC1hZ2U9MCc7XG5cbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6JyA/ICdfX0hvc3QtJyArIGNvb2tpZSArICc7IHNlY3VyZScgOiBjb29raWU7XG4gICAgfVxufVxuXG4vKiBzdGltdWx1c0ZldGNoOiAnbGF6eScgKi9cbmV4cG9ydCBkZWZhdWx0ICdjc3JmLXByb3RlY3Rpb24tY29udHJvbGxlcic7XG4iXSwibmFtZXMiOlsibmFtZUNoZWNrIiwidG9rZW5DaGVjayIsImRvY3VtZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2ZW50IiwiZ2VuZXJhdGVDc3JmVG9rZW4iLCJ0YXJnZXQiLCJoIiwiZ2VuZXJhdGVDc3JmSGVhZGVycyIsImRldGFpbCIsImZvcm1TdWJtaXNzaW9uIiwiZm9ybUVsZW1lbnQiLCJPYmplY3QiLCJrZXlzIiwibWFwIiwiayIsImZldGNoUmVxdWVzdCIsImhlYWRlcnMiLCJyZW1vdmVDc3JmVG9rZW4iLCJjc3JmRmllbGQiLCJxdWVyeVNlbGVjdG9yIiwiY3NyZkNvb2tpZSIsImdldEF0dHJpYnV0ZSIsImNzcmZUb2tlbiIsInZhbHVlIiwidGVzdCIsInNldEF0dHJpYnV0ZSIsImRlZmF1bHRWYWx1ZSIsImJ0b2EiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJhcHBseSIsIndpbmRvdyIsImNyeXB0byIsIm1zQ3J5cHRvIiwiZ2V0UmFuZG9tVmFsdWVzIiwiVWludDhBcnJheSIsImRpc3BhdGNoRXZlbnQiLCJFdmVudCIsImJ1YmJsZXMiLCJjb29raWUiLCJsb2NhdGlvbiIsInByb3RvY29sIl0sInNvdXJjZVJvb3QiOiIifQ==