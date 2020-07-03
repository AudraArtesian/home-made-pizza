import React, { useMemo, useState, useCallback, useReducer, memo, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Banner, Cart, AddressForm, Catalog, DeliverySection, Footer, Header, Modal } from 'ui-kit';
import { v4 as uuidv4 } from 'uuid';
import { StyledAppContainer } from './app.styles';
import { AboutUsSection } from './about-us-section/about-us-section.component';
import { pizzaItems, drinksItems, menuItems } from './data-stub';
import { HashLink } from './hash-link/hash-link.component';
import { getJson, postJson } from './services';
import { getProductsEndpoint, createOrderEndpoint } from './endpoints';
import {
	cheesePizzaImageUrl,
	meatPizzaImageUrl,
	classPizzaImageUrl,
	fruitDrinkImageUrl,
	stillWaterImageUrl,
} from './images';

const initialState = { cart: [] };
const reducer = (state, action) => {
	switch (action.type) {
		case 'ADD': {
			const sameItem = state.cart.find((item) => item.id === action.payload.id);
			if (sameItem === undefined) {
				const newItem = {
					...action.payload,
					count: 1,
				};
				return {
					cart: [...state.cart, newItem],
				};
			}
			const newCart = state.cart.map((item) => {
				if (item.productName === action.payload.productName) {
					return {
						...item,
						count: sameItem.count + 1,
					};
				}
				return item;
			});
			return {
				cart: newCart,
			};
		}

		case 'DELETE': {
			const removingItem = state.cart.find((item) => item.productName === action.payload.productName);
			const removingIndex = state.cart.findIndex((item) => item === removingItem);
			const newCart = [...state.cart];
			newCart.splice(removingIndex, 1);

			return {
				cart: newCart,
			};
		}

		case 'REMOVE': {
			const removingItem = state.cart.find((item) => item.productName === action.payload.productName);
			const newCart = state.cart.map((item) => {
				if (item === removingItem && item.count > 1) {
					return {
						...item,
						count: item.count - 1,
					};
				}
				return item;
			});
			return {
				cart: newCart,
			};
		}
		case 'CLEAR': {
			return { cart: [] };
		}
		default: {
			return state;
		}
	}
};

const imagesMapper = {
	'Сыр сыр': cheesePizzaImageUrl,
	Мексиканская: meatPizzaImageUrl,
	'От Шефа': classPizzaImageUrl,
	'Молоко Афанасий': stillWaterImageUrl,
	'Вятский квас': fruitDrinkImageUrl,
};

const prepareCartToSend = (acc, currentItem) => {
	const item = { ...currentItem };
	let itemCount = currentItem.count;
	delete item.count;
	while (itemCount > 0) {
		acc.push(item);
		itemCount -= 1;
	}
	return acc;
};

export const App = () => {
	const [pizzaState, setPizzaState] = useState([]);
	const [drinksState, setDrinksState] = useState([]);
	const [cartState, dispatch] = useReducer(reducer, initialState);
	const [isOrderSent, setIsOrderSent] = useState(false);
	const handleAddToCart = (payload) => () =>
		dispatch({
			type: 'ADD',
			payload,
		});
	const handleDeleteFromCart = (payload) => () =>
		dispatch({
			type: 'DELETE',
			payload,
		});

	const handleRemoveFromCart = (payload) => () =>
		dispatch({
			type: 'REMOVE',
			payload,
		});

	const handleClearCart = () =>
		dispatch({
			type: 'CLEAR',
		});

	const handleCreateOrder = (payload) => {
		if (process.env.API_MOCK === 'true') {
			setIsOrderSent(true);
			return;
		}
		postJson(createOrderEndpoint, payload).then((response) => {
			setIsOrderSent(response);
		});
	};

	const handleOrderSubmit = (addressData) => (event) => {
		event.preventDefault();
		const orderPayload = {
			id: uuidv4(),
			productId: cartState.cart.reduce(prepareCartToSend, []),
			...addressData,
		};
		handleCreateOrder(orderPayload);
		handleClearCart();
	};
	const cartCount = useMemo(
		() =>
			cartState.cart.reduce((acc, elem) => {
				return acc + (elem.count !== undefined ? elem.count : 0);
			}, 0),
		[cartState.cart]
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const handleModalOpen = useCallback(() => setIsModalOpen(true), []);
	const handleModalClose = useCallback(() => {
		setIsOrderSent(false);
		setIsModalOpen(false);
	}, []);
	const renderLinkWrapper = useCallback(
		(children, anchor, idPrefix, idKey) => (
			<HashLink to={anchor} id={`${idPrefix}-menu-item`} key={idKey}>
				{children}
			</HashLink>
		),
		[]
	);
	const totalPizzasAndDrinks = useMemo(
		() =>
			cartState.cart.reduce(
				(acc, elem) => {
					const accIndex = elem.type === 'pizza' ? 0 : 1;
					acc[accIndex] += elem.count;
					return acc;
				},
				[0, 0]
			),
		[cartState]
	);

	const isError = useMemo(() => totalPizzasAndDrinks[0] > 5 || totalPizzasAndDrinks[1] > 4, [totalPizzasAndDrinks]);

	const fetchProducts = () => {
		getJson(getProductsEndpoint).then((products) => {
			const groupedProducts = products.reduce(
				(acc, product) => {
					const isPizza = product.pizzaType !== undefined;
					const productWithImage = {
						...product,
						image: imagesMapper[product.productName],
						type: isPizza ? 'pizza' : 'drink',
					};
					isPizza ? acc.pizza.push(productWithImage) : acc.drinks.push(productWithImage);
					return acc;
				},
				{ pizza: [], drinks: [] }
			);

			setPizzaState(groupedProducts.pizza);
			setDrinksState(groupedProducts.drinks);
		});
	};

	useEffect(() => {
		if (process.env.API_MOCK === 'false') {
			fetchProducts();
		}
	}, []);

	return (
		<Router>
			<StyledAppContainer>
				<Header
					menuItems={menuItems}
					cartCount={cartCount}
					onModalOpen={handleModalOpen}
					renderLinkWrapper={renderLinkWrapper}
					menuColor="#17181A"
				/>
				<Banner />
				<Catalog
					heading="Пицца"
					items={process.env.API_MOCK === 'false' ? pizzaState : pizzaItems}
					id="pizza"
					onAddToCart={handleAddToCart}
					onDeleteFromCart={handleDeleteFromCart}
					cartState={cartState}
				/>
				<Catalog
					heading="Напитки"
					items={process.env.API_MOCK === 'false' ? drinksState : drinksItems}
					id="drinks"
					onAddToCart={handleAddToCart}
					onDeleteFromCart={handleDeleteFromCart}
					cartState={cartState}
				/>
				<DeliverySection id="delivery" />
				<AboutUsSection id="about-us" />
			</StyledAppContainer>
			<Footer menuItems={menuItems} renderLinkWrapper={renderLinkWrapper} menuColor="#ffffff" />
			<Modal isOpen={isModalOpen} onClose={handleModalClose}>
				<Cart
					cartState={cartState}
					onClose={handleModalClose}
					onAddToCart={handleAddToCart}
					onDeleteFromCart={handleDeleteFromCart}
					onRemoveFromCart={handleRemoveFromCart}
					onClearCart={handleClearCart}
					isOrderSent={isOrderSent}
					isError={isError}
				>
					<AddressForm onSubmit={handleOrderSubmit} isError={isError} />
				</Cart>
			</Modal>
		</Router>
	);
};

export default memo(App);
