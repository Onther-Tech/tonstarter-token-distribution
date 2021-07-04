# Functions Summary:

- [`mint(address to, uint256 amount)`](#ITOS-mint-address-uint256-)

- [`burn(address from, uint256 amount)`](#ITOS-burn-address-uint256-)

- [`DOMAIN_SEPARATOR()`](#ITOS-DOMAIN_SEPARATOR--)

- [`nonces(address owner)`](#ITOS-nonces-address-)

- [`permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)`](#ITOS-permit-address-address-uint256-uint256-uint8-bytes32-bytes32-)

- [`verify(address owner, address spender, uint256 value, uint256 deadline, uint256 _nounce, bytes32 sigR, bytes32 sigS, uint8 sigV)`](#ITOS-verify-address-address-uint256-uint256-uint256-bytes32-bytes32-uint8-)

- [`hashPermit(address owner, address spender, uint256 value, uint256 deadline, uint256 _nounce)`](#ITOS-hashPermit-address-address-uint256-uint256-uint256-)

###### *ITOS-mint-address-uint256-*

# Function `mint`

**mint(address to, uint256 amount)**

Issue a token.

### Parameters:

- `to`:  who takes the issue

- `amount`: the amount to issue

###### *ITOS-burn-address-uint256-*

# Function `burn`

**burn(address from, uint256 amount)**

No description

### Parameters:

- `from`: Whose tokens are burned

- `amount`: the amount to burn

###### *ITOS-DOMAIN_SEPARATOR--*

# Function `DOMAIN_SEPARATOR`

**DOMAIN_SEPARATOR()**

No description

###### *ITOS-nonces-address-*

# Function `nonces`

**nonces(address owner)**

No description

###### *ITOS-permit-address-address-uint256-uint256-uint8-bytes32-bytes32-*

# Function `permit`

**permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)**

Authorizes the owner's token to be used by the spender as much as the value.

The signature must have the owner's signature.

### Parameters:

- `owner`: the token's owner

- `spender`: the account that spend owner's token

- `value`: the amount to be approve to spend

- `deadline`: the deadline that valid the owner's signature

- `v`: the owner's signature - v

- `r`: the owner's signature - r

- `s`: the owner's signature - s

###### *ITOS-verify-address-address-uint256-uint256-uint256-bytes32-bytes32-uint8-*

# Function `verify`

**verify(address owner, address spender, uint256 value, uint256 deadline, uint256 _nounce, bytes32 sigR, bytes32 sigS, uint8 sigV)**

verify the signature

### Parameters:

- `owner`: the token's owner

- `spender`: the account that spend owner's token

- `value`: the amount to be approve to spend

- `deadline`: the deadline that valid the owner's signature

- `_nounce`: the _nounce

- `sigR`: the owner's signature - r

- `sigS`: the owner's signature - s

- `sigV`: the owner's signature - v

###### *ITOS-hashPermit-address-address-uint256-uint256-uint256-*

# Function `hashPermit`

**hashPermit(address owner, address spender, uint256 value, uint256 deadline, uint256 _nounce)**

the hash of Permit

### Parameters:

- `owner`: the token's owner

- `spender`: the account that spend owner's token

- `value`: the amount to be approve to spend

- `deadline`: the deadline that valid the owner's signature

- `_nounce`: the _nounce
