import React, { useContext, useEffect, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { getListPaymentMethod } from "app/const/Api";
import { KEY_CODE_ESCAPE } from "app/const/Keyboard";
import { reducer } from "app/const/Reducer";
import {
  DEFAULT_METHOD_PAYMENT,
  PAYMENT_METHODS,
} from "app/modules/jobdetail/const/Invoice";
import { AddPaymentContext } from "app/modules/jobdetail/contexts/AddPaymentContext";
import Cards from "app/modules/jobdetail/tabs/payment/components/payment/Cards";
import ValuePayment from "app/modules/jobdetail/tabs/payment/components/payment/Value";
import IconDropDown from "assets/icon/IconDropDown";
import IconWallet from "assets/icon/IconWallet";
import { clientQuery } from "common/utils/ApiUtils";

const PaymentMethods = () => {
  const { t } = useTranslation();
  const { addPayment, updateNumberPaymentContext, updatePaymentDataContext } =
    useContext(AddPaymentContext);
  const addonsList = useSelector(({ auth }) => auth.user.settings.addons);
  const refSearch = useRef({});

  const [state, setState] = useReducer(reducer, {
    isVisible: false,
    isLoading: true,
    methods: [],
  });

  const refDropdown = useRef(null);

  const { isVisible: finalIsVisible, methods: finalMethods } = state;
  const { paymentSelected, customerId } = addPayment;

  useEffect(() => {
    clientQuery(
      getListPaymentMethod,
      { data: { customer_id: customerId }, method: "GET" },
      _getListPaymentMethodSuccess
    );
  }, [customerId]);

  useEffect(() => {
    if (finalIsVisible) {
      document.addEventListener("click", handleClickOutside, true);
      document.addEventListener("keydown", handleHideDropdown, true);
    } else {
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("keydown", handleHideDropdown, true);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("keydown", handleHideDropdown, true);
    };
  }, [finalIsVisible]);

  function handleHideDropdown(event) {
    const elPrevent = document.getElementById(
      "show_list_company_payment_method"
    );
    if (event.keyCode === KEY_CODE_ESCAPE && elPrevent) {
      _closeSearchResult();
      return false;
    }

    const finalKey = event.key;
    const listItem = finalMethods.filter((item) =>
      item.name[0].toLowerCase().includes(finalKey)
    );

    const oldValue = refSearch.current[finalKey] || 0;
    let findItem = listItem[oldValue];
    refSearch.current = { [finalKey]: oldValue + 1 };

    if (!findItem) {
      findItem = listItem[0];
      refSearch.current = { [finalKey]: findItem ? 1 : 0 };
    }

    if (findItem) {
      _handleSelect(event, findItem, findItem.id === paymentSelected.id, false);
    }
  }

  function handleClickOutside(event) {
    const elPrevent = document.getElementById(
      "show_list_company_payment_method"
    );

    if (
      refDropdown.current &&
      elPrevent &&
      !elPrevent.contains(event.target) &&
      !refDropdown.current.contains(event.target)
    ) {
      _closeSearchResult();
    }
  }

  function _closeSearchResult() {
    finalIsVisible && setState({ isVisible: false });
  }

  const _handleOpen = (e) => {
    e.stopPropagation();

    setState({ isVisible: !finalIsVisible });
  };

  const _getDefaultMethod = (methods = []) => {
    return (
      methods.find((item) => item.is_default) ||
      methods[0] ||
      DEFAULT_METHOD_PAYMENT
    );
  };

  function _getListPaymentMethodSuccess(response) {
    const isMethodAddons = !!addonsList.stripe || !!addonsList.square;
    const responseData = [...response.data];
    let selected = {};

    if (isMethodAddons) {
      selected =
        responseData.find((item) => {
          const { id: methodId, is_default_merchant: isMerchant } = item;

          return (
            [
              PAYMENT_METHODS.STRIPE,
              PAYMENT_METHODS.SQUARE,
              PAYMENT_METHODS.ACH,
            ].includes(methodId) && isMerchant
          );
        }) || _getDefaultMethod(responseData);
    } else {
      selected = _getDefaultMethod(responseData);
    }

    setState({
      isLoading: false,
      methods: responseData,
    });

    updatePaymentDataContext({
      listPaymentMethod: responseData,
      paymentSelected: selected,
    });
  }

  function _handleSelect(e, item, isActive, shouldClose = true) {
    e && e.stopPropagation();

    if (isActive) {
      return false;
    }
    const newData = {
      paymentSelected: item,
      valuePayment: "",
      activeCredit: false,
      activeDeposit: false,
    };

    if (item.id === PAYMENT_METHODS.ACH) {
      newData.invoiceSelected = [];
      newData.checkAll = false;
    }
    updateNumberPaymentContext(newData);

    if (shouldClose) {
      setState({
        isVisible: false,
      });
    }
  }

  function _renderOptions() {
    return finalMethods.map((item) => {
      const paymentId = item.id;
      const isActive = paymentId === paymentSelected.id;
      if (paymentId === PAYMENT_METHODS.CREDIT) {
        return false;
      }
      return (
        <li
          key={paymentId}
          onClick={(e) => _handleSelect(e, item, isActive)}
          className={`items ${isActive ? "active" : ""}`}
          tabIndex="0"
        >
          <p className="txt-ellipsis">{item.name}</p>
        </li>
      );
    });
  }

  function _renderValuePayment() {
    switch (paymentSelected.id) {
      case PAYMENT_METHODS.CREDIT:
      case PAYMENT_METHODS.DEPOSIT:
        return null;
      case PAYMENT_METHODS.CASH:
        return <ValuePayment placeholder={t("customers:memo")} />;
      case PAYMENT_METHODS.CHECK:
        return <ValuePayment placeholder={t("customers:check_number")} />;
      case PAYMENT_METHODS.STRIPE:
      case PAYMENT_METHODS.SQUARE:
      case PAYMENT_METHODS.ACH:
        return <Cards customerId={customerId} />;
      default:
        return <ValuePayment placeholder={t("customers:memo")} />;
    }
  }

  return (
    <div className="sm-row">
      <div className="txt">
        <IconWallet isHasColor />
        <span className="flex-1 txt-ellipsis">{t("common:method")}</span>
      </div>
      <div className="detail d-flex">
        <div
          className={`v2-dropdown select-method ${
            finalIsVisible ? "active" : ""
          }`}
          ref={refDropdown}
        >
          <div
            className="dropbtn items selection"
            onClick={(e) => _handleOpen(e)}
            tabIndex="0"
          >
            <span className="txt-ellipsis mr-0">
              {paymentSelected?.name || ""}
            </span>
            <span className="svg-selectbox">
              <IconDropDown />
            </span>
          </div>
          <div
            className="v2-dropdown__menu scrolls"
            id={"show_list_company_payment_method"}
          >
            <ul>{_renderOptions()}</ul>
          </div>
        </div>
        {_renderValuePayment()}
      </div>
    </div>
  );
};

export default PaymentMethods;
