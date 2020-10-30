var CurrencyConversionModel = require("../models/CurrencyConversion");

var getFiatValue = async (crypto) => {

    var fiatSql = `SELECT json(quote->'USD'->'price') as asset_1_usd, json(quote->'EUR'->'price') as asset_1_eur, 
                        json(quote->'INR'->'price') as asset_1_inr, symbol 
                        FROM currency_conversion
                        WHERE deleted_at IS NULL AND symbol LIKE '%${crypto}%'`

    var fiatData = await CurrencyConversionModel.knex().raw(fiatSql);
    fiatData = fiatData.rows;

    var fiatObject = {}
    fiatObject.asset_1_usd = (fiatData.length > 0) ? (fiatData[0].asset_1_usd) : (0.0);
    fiatObject.asset_1_eur = (fiatData.length > 0) ? (fiatData[0].asset_1_eur) : (0.0);
    fiatObject.asset_1_inr = (fiatData.length > 0) ? (fiatData[0].asset_1_inr) : (0.0);


    console.log("fiatObject", (fiatObject))
    return fiatObject;
}

module.exports = {
    getFiatValue
}