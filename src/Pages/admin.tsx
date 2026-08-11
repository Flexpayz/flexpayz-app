import {Button, Checkbox, Input} from "@mui/material";
import {useEffect, useMemo, useRef, useState} from "react";
import './admin.css'
import {notify} from "./login-page";
import {defaultPermissions, Permissions} from "../components/usePermission";
import {QRCodeCanvas} from "qrcode.react";
import SerialUploader from "../components/serial-number-uploader";
import ExportSerialsCSVButton from "../components/serial-csv-buton";
import {Preview} from "../preview";
import {createEmptyAdultJournal, createEmptyBabyJournal} from "../firestore/repositories/journals";
import {createEmptyAnimalTag} from "../firestore/repositories/animalTags";
import {createProduct, listInactiveProducts} from "../firestore/repositories/products";
import {getPermissions, setPermissions, updatePermissions} from "../firestore/repositories/permissions";
import type {FirestoreDocument} from "../firestore/schema/primitives";
import type {Product as ProductData} from "../control-state";

export {Preview};

export const random_hex_code = () => {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return n.slice(0, 6).toLocaleUpperCase();
};

export function AdminPage() {
    const [orderedProducts, setOrderedProducts] = useState(0)
    const [products, setProducts] = useState<FirestoreDocument<ProductData>[]>([])

    const createProducts = async () => {

        for (let i = 0; i < orderedProducts; i++) {
            const hexCode = random_hex_code()
            createProduct({
                activated: false,
                unlockCode: hexCode,
                name: "New Product",
                preview: Preview.BUSINESS_CARD,
            }).then((created) => {
                setProducts((prev) => [...prev, created])
                setPermissions(created.id, defaultPermissions)
                createEmptyAdultJournal(created.id)
                createEmptyBabyJournal(created.id)
                createEmptyAnimalTag(created.id)
            })
        }
        notify(`You created ${orderedProducts} products.`)

    }



    useEffect(() => {
        (async () => {
            const inactiveProducts = await listInactiveProducts();
            setProducts(inactiveProducts);
        })()
    }, [])

    const [changePermissionsProduct, setChangePermissionsProduct] = useState<string>("")

    return (<div className={"admin-products-page"}>
        <div className={"modal"}>
            <Input value={orderedProducts} type={'number'} onChange={(e: any) => {
                setOrderedProducts(e.target.value)
            }}/>
            <Button onClick={createProducts}>get products</Button>
            <div className={"admin-products"}>
                {products.map((product) => (<Product key={`product-${product.id}`} product={product}
                                                     onChangePermissions={setChangePermissionsProduct}/>

            ))}
            </div>
        </div>
        <ChangePermissionsModal productId={changePermissionsProduct}/>
        <SerialUploader setProducts={setProducts}/>
        <ExportSerialsCSVButton/>

    </div>)
}

function ChangePermissionsModal({productId}: { productId: string }) {
    const [currentPermissions, setCurrentPermissions] = useState(defaultPermissions)
    useEffect(() => {
        (async () => {
            if (productId) {
                setCurrentPermissions(await getPermissions(productId))
            }
        })()
    }, [productId]);

    const onSave = async () => {
        await updatePermissions(productId, currentPermissions)
    }

    return <div className={"permission-modal"}>
        <QRCodeGenerator productId={productId}/>
        <h1>Change Permissions</h1>
        <div>BUSINESS CARD <Checkbox checked={currentPermissions.business_card} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, business_card: !prev.business_card}))
        }}/></div>
        <div>CUSTOM LINK <Checkbox checked={currentPermissions.custom_link} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, custom_link: !prev.custom_link}))
        }}/></div>
        <div>UPLOAD FILES <Checkbox checked={currentPermissions.upload_files} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, upload_files: !prev.upload_files}))
        }}/></div>
        <div>UPLOAD VIDEO <Checkbox checked={currentPermissions.upload_video} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, upload_video: !prev.upload_video}))
        }}/></div>
        <div>UPLOAD SONGS <Checkbox checked={currentPermissions.upload_songs} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, upload_songs: !prev.upload_songs}))
        }}/></div>
        <div>BABY JOURNAL <Checkbox checked={currentPermissions.baby_journal} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, baby_journal: !prev.baby_journal}))
        }}/></div>
        <div>ADULT JOURNAL <Checkbox checked={currentPermissions.adult_journal} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, adult_journal: !prev.adult_journal}))
        }}/></div>
        <div>ANIMAL TAG <Checkbox checked={currentPermissions.animal_tag} onChange={() => {
            setCurrentPermissions((prev: Permissions) => ({...prev, animal_tag: !prev.animal_tag}))
        }}/></div>
        <Button onClick={onSave}>SAVE PERMISSIONS</Button>
    </div>
}


function QRCodeGenerator({productId}: { productId: string }) {

    const qrLink = useMemo(() => `https://flexpayz.com/show-product?product_id=${productId}`, [productId])

    const qrRef = useRef<HTMLCanvasElement>(null);

    const downloadQRCode = () => {
        if (!qrRef.current) return;
        const canvas = qrRef.current;
        const url = canvas.toDataURL("image/png");

        const a = document.createElement("a");
        a.href = url;
        a.download = `qr-code-${productId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    return <div className={"qr-code-generator"}>
        <QRCodeCanvas value={qrLink} size={100} ref={qrRef}/>
        <Button onClick={downloadQRCode}>Download QR Code</Button>
    </div>
}


const Product = ({product, onChangePermissions}: {product: FirestoreDocument<ProductData>; onChangePermissions: (productId: string) => void}) => {
    const copyLink = (productId: string) => {
        navigator.clipboard.writeText(`https://flexpayz.com/show-product?product_id=${productId}`)
    }
    return (<div>
        <span>{product.id}</span>
        <br/>
        <span>{product.data.unlockCode}</span>
        <Button onClick={() => {
            copyLink(product.id)
        }}>Link</Button>
        <Button onClick={() => {
            onChangePermissions(product.id)
        }}>PERMISSIONS</Button>
        <br/>
        <br/>

    </div>)
}
