<button
  onClick={() => {
    const cart = getCart();

    const newItem = {
      item_code: item.item_code,
      item_name: item.item_name,
      selling_price: item.selling_price,
      qty: 1,
    };

    if (!cart) {
      saveCart({
        restroCode: Number(restro),
        arrivalTime: arrival,
        items: [newItem],
      });
    } else {
      const existing = cart.items.find(
        (i: any) => i.item_code === item.item_code
      );

      if (existing) {
        existing.qty += 1;
      } else {
        cart.items.push(newItem);
      }

      saveCart(cart);
    }

    alert("Added to cart");
  }}
  className="bg-green-600 text-white px-3 py-1 rounded"
>
  Add
</button>
