import './Item.scss';
const Item = ({data, index}) => {
    console.log(index);
    return <div key={index} className={`item item${(parseInt(index) + 1)} ${data?.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
        <div className="info">
          <h2>{data?.title}</h2>
          <div className="texts">
            {data?.description}
          </div>
          <button>{data?.buttonText}</button>
        </div>
    </div>
}

export default Item;