export class AppConstants {
    static readonly checkoutInfo = {
        FIRST_NAME: 'Shriram',
        LAST_NAME: 'Rengarajan',
        POSTAL_CODE: '600091',
    };

    static readonly products = {
        BACKPACK_LABEL: 'Sauce Labs Backpack',
        BACKPACK_SLUG: 'sauce-labs-backpack',
        BACKPACK_PRICE: '$29.99',
        BIKE_LIGHT_LABEL: 'Sauce Labs Bike Light',
        BIKE_LIGHT_SLUG: 'sauce-labs-bike-light',
        BIKE_LIGHT_PRICE: '$9.99',
        ONESIE_LABEL: 'Sauce Labs Onesie',
        ONESIE_SLUG: 'sauce-labs-onesie',
        ONESIE_PRICE: '$7.99',
        FLEECE_LABEL: 'Sauce Labs Fleece Jacket',
        FLEECE_SLUG: 'sauce-labs-fleece-jacket',
        FLEECE_PRICE: '$49.99',
    };

    static readonly loginErrors = {
        INVALID_CREDENTIALS: 'Username and password do not match any user in this service',
        LOCKED_OUT: 'Sorry, this user has been locked out.',
        USERNAME_REQUIRED: 'Username is required',
        PASSWORD_REQUIRED: 'Password is required',
    };

    static readonly users = {
        STANDARD: 'standard_user',
        LOCKED_OUT: 'locked_out_user',
        INVALID: 'invalid_user',
    };

    static readonly sortOrders = {
        NAME_A_TO_Z: [
            'Sauce Labs Backpack',
            'Sauce Labs Bike Light',
            'Sauce Labs Bolt T-Shirt',
            'Sauce Labs Fleece Jacket',
            'Sauce Labs Onesie',
            'Test.allTheThings() T-Shirt (Red)',
        ],
        NAME_Z_TO_A: [
            'Test.allTheThings() T-Shirt (Red)',
            'Sauce Labs Onesie',
            'Sauce Labs Fleece Jacket',
            'Sauce Labs Bolt T-Shirt',
            'Sauce Labs Bike Light',
            'Sauce Labs Backpack',
        ],
        PRICE_LOW_TO_HIGH: [
            'Sauce Labs Onesie',
            'Sauce Labs Bike Light',
            'Sauce Labs Bolt T-Shirt',
            'Test.allTheThings() T-Shirt (Red)',
            'Sauce Labs Backpack',
            'Sauce Labs Fleece Jacket',
        ],
        PRICE_HIGH_TO_LOW: [
            'Sauce Labs Fleece Jacket',
            'Sauce Labs Backpack',
            'Sauce Labs Bolt T-Shirt',
            'Test.allTheThings() T-Shirt (Red)',
            'Sauce Labs Bike Light',
            'Sauce Labs Onesie',
        ],
    };
}

export default AppConstants;