var CurrencyConversionModel = require("../models/CurrencyConversion");

var getFiatValue = async (crypto) => {

    var fiatSql = `SELECT json(quote->'USD'->'price') as asset_1_usd, json(quote->'EUR'->'price') as asset_1_eur, 
                        json(quote->'INR'->'price') as asset_1_inr, symbol 
                        FROM currency_conversion
                        WHERE deleted_at IS NULL AND symbol LIKE '%${crypto}%'`

    var fiatData = await CurrencyConversionModel.knex().raw(fiatSql);
    fiatData = fiatData.rows;

    var fiatObject = {}
    fiatObject.asset_1_usd = fiatData[0].asset_1_usd;
    fiatObject.asset_1_eur = fiatData[0].asset_1_eur;
    fiatObject.asset_1_inr = fiatData[0].asset_1_inr;


    console.log("fiatObject", (fiatObject))
    return fiatObject;
}

module.exports = {
    getFiatValue
}