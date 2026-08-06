import {ConfigInput} from "../components/config-input";
import {Button, Checkbox, Input} from "@mui/material";
import {useNavigate} from "react-router";
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import {MainContext} from "../contexts";
import {doc, setDoc, addDoc, collection, query, where, getDocs, updateDoc, getDoc} from "firebase/firestore"
import './admin.css'
import {notify} from "./login-page";
import {db} from "../App";
import {DB_COLLECTIONS, DB_STORAGE} from "../components/baby-journal-settings";
import {defaultPermissions, Permissions} from "../components/usePermission";
import {QRCodeCanvas} from "qrcode.react";
import SerialUploader from "../components/serial-number-uploader";
import ExportSerialsCSVButton from "../components/serial-csv-buton";
import { getAuth, onAuthStateChanged } from 'firebase/auth';  // Modular import for auth
import { getIdTokenResult } from 'firebase/auth';  // To get custom claims
import {Preview} from "../preview";
import {LoadingPanel} from "../components/design-system";

export {Preview};

export const random_hex_code = () => {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return n.slice(0, 6).toLocaleUpperCase();
};

export function AdminPage() {
    const [orderedProducts, setOrderedProducts] = useState(0)
    const [products, setProducts] = useState<any[]>([])
    const {db} = useContext(MainContext)
    const navigate = useNavigate()

    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true); // To handle loading state

    useEffect(() => {
        const auth = getAuth(); // Get the auth instance
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            // Get ID token result to check for custom claims (like admin)
            user.getIdTokenResult()
              .then((idTokenResult) => {
                if (idTokenResult.claims.admin) {
                  setIsAdmin(true);
                } else {
                  setIsAdmin(false);
                }
              })
              .catch((error) => {
                console.error('Error checking admin claim:', error);
                setIsAdmin(false);
              })
              .finally(() => setLoading(false)); // Set loading to false after the check
          } else {
            setIsAdmin(false);
            setLoading(false); // If no user, set loading to false
          }
        });
    
        // Clean up the subscription when the component unmounts
        return () => unsubscribe();
      }, []);

  console.log(isAdmin, 'isAdmin')

    const createProducts = async () => {

        for (let i = 0; i < orderedProducts; i++) {
            const hexCode = random_hex_code()
            addDoc(collection(db, 'products'), {
                activated: false,
                unlockCode: hexCode,
                name: "New Product",
                preview: Preview.BUSINESS_CARD,
                processed: false
            }).then((data) => {
                setProducts((prev) => [...prev, {
                    id: data.id, activated: false,
                    unlockCode: hexCode,
                    name: "New Product",
                    preview: Preview.BUSINESS_CARD,
                    processed: false
                }])
                setDoc(doc(db, DB_COLLECTIONS.PERMISSIONS, data.id), defaultPermissions)
                setDoc(doc(db, DB_COLLECTIONS.ADULT_JOURNALS, data.id), {})
                setDoc(doc(db, DB_COLLECTIONS.BABY_JOURNALS, data.id), {})
                setDoc(doc(db, DB_COLLECTIONS.ANIMAL_TAG, data.id), {})
            })
        }
        notify(`You created ${orderedProducts} products.`)

    }



    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            const q = query(collection(db, "products"), where("activated", "==", false));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                console.log('doc', doc.data())
                setProducts((prev: any) => [...prev, {id: doc.id, ...doc.data()}])
            });
        })()
    }, [isAdmin])

    const [changePermissionsProduct, setChangePermissionsProduct] = useState<string>("")

  if (loading) {
    return <div className="admin-loading-screen"><LoadingPanel text="Loading admin dashboard"/></div>;
  }

  if (!isAdmin) {
    return <div>You do not have admin permissions.</div>;
  }


    return (<div className={"page"}>
        <div className={"modal"}>
            <Button onClick={() => navigate("/admin/serial-migration")}>
                Open Serial Migration Page
            </Button>
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
                const productRef = doc(db, DB_COLLECTIONS.PERMISSIONS, productId)
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    setCurrentPermissions((prev: Permissions) => ({...prev, ...docSnap.data() as Permissions}))
                }
            }
        })()
    }, [productId]);

    const onSave = async () => {
        const docRef = doc(db, DB_COLLECTIONS.PERMISSIONS, productId)
        await updateDoc(docRef, {...currentPermissions})
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


const Product = ({product, onChangePermissions}: any) => {
    const copyLink = (productId: string) => {
        navigator.clipboard.writeText(`https://flexpayz.com/show-product?product_id=${productId}`)
    }
    const [processed, setProcessed] = useState(false)

    useEffect(() => {
        setProcessed(product.processed)
        console.log(product.processed, '222')
    }, []);

    const onProcessedProduct = async (e: any) => {
        if (product.id) {
            const productRef = doc(db, 'products', product.id)
            console.log(e.target.checked, 'here22')
            await updateDoc(productRef, {processed: e.target.checked})
            console.log(e.target.checked, 'here')
            setProcessed((prevState: boolean) => !prevState)
        }
    }

    return (<div>
        <span>{product.id}</span>
        <br/>
        <span>{product.unlockCode}</span>
        <Button onClick={() => {
            copyLink(product.id)
        }}>Link</Button>
        <Checkbox checked={processed} onChange={onProcessedProduct}/>
        <Button onClick={() => {
            onChangePermissions(product.id)
        }}>PERMISSIONS</Button>
        <br/>
        <br/>

    </div>)
}
