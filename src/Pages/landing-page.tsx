import {Box, Stack} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DiamondOutlinedIcon from "@mui/icons-material/DiamondOutlined";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import {useNavigate} from "react-router";
import type {MouseEvent, ReactNode} from "react";
import './login-page.css'
import {AppButton} from "../components/design-system/AppButton";
import {FlexPayzLogo} from "../components/design-system/FlexPayzLogo";
import {PageShell} from "../components/design-system/PageShell";
import {Surface} from "../components/design-system/Surface";

const WEBSHOP_URL = 'https://www.flexpayz.se';
const SUPPORT_URL = 'https://www.flexpayz.se/pages/get-started';

type EntryPageProps = {
    onManageDevices: () => void;
};

export function LandingPage() {
    const navigate = useNavigate()

    return <EntryPage onManageDevices={() => navigate('/login')}/>
}

export function FirstPageWrapper() {
    return <LandingPage/>
}

function EntryPage({onManageDevices}: EntryPageProps) {
    const openWebshop = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        window.location.replace(WEBSHOP_URL);
    };

    return (
        <PageShell bleed className="entry-page-shell" sx={{py: 0}}>
            <Box className="entry-page">
                <Box className="entry-decor entry-decor-top" aria-hidden="true"/>
                <Box className="entry-decor entry-decor-bottom" aria-hidden="true"/>
                <Box className="entry-container">
                    <Box component="header" className="entry-header">
                        <FlexPayzLogo className="entry-logo"/>
                        <Stack direction="row" className="entry-header-actions">
                            <a
                                href={SUPPORT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="entry-support-link"
                            >
                                Help & support
                            </a>
                            <button
                                type="button"
                                className="entry-help-button"
                                aria-label="Help and support"
                                onClick={() => window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')}
                            >
                                <HelpOutlineRoundedIcon fontSize="small" aria-hidden="true"/>
                            </button>
                        </Stack>
                    </Box>

                    <Box className="entry-main">
                        <Box component="section" className="entry-hero" aria-labelledby="entry-heading">
                            <Box component="p" className="entry-kicker">
                                YOUR FLEXPAYZ STARTS HERE
                            </Box>
                            <Box id="entry-heading" component="h1" className="entry-heading">
                                <span>One tap.</span>
                                <span>Everything connected.</span>
                            </Box>
                            <Box component="p" className="entry-description">
                                Manage your FlexPayz products, update what you share and stay in control—wherever you are.
                            </Box>
                            <Stack className="entry-actions">
                                <AppButton
                                    type="button"
                                    variant="contained"
                                    className="entry-action-primary"
                                    onClick={onManageDevices}
                                    endIcon={<ArrowForwardRoundedIcon aria-hidden="true"/>}
                                >
                                    Manage my devices
                                </AppButton>
                                <AppButton
                                    component="a"
                                    href={WEBSHOP_URL}
                                    variant="outlined"
                                    className="entry-action-secondary"
                                    aria-label="Explore the webshop"
                                    onClick={openWebshop}
                                    endIcon={<NorthEastRoundedIcon aria-hidden="true"/>}
                                >
                                    Explore the webshop
                                </AppButton>
                            </Stack>
                        </Box>

                        <ProductPresentation/>
                    </Box>

                    <EntryBenefits/>
                    <Box component="footer" className="entry-mobile-footer">
                        SECURE · CONTACTLESS · YOURS
                    </Box>
                </Box>
            </Box>
        </PageShell>
    );
}

function ProductPresentation() {
    return (
        <Surface component="section" className="entry-product-card" aria-label="FlexPayz product presentation">
            <Box className="entry-product-glow" aria-hidden="true"/>
            <ProductBadge className="entry-product-badge entry-product-badge-top">
                One product. Many possibilities.
            </ProductBadge>
            <ProductVisual/>
            <ProductBadge className="entry-product-badge entry-product-badge-bottom">
                Update your content anytime
            </ProductBadge>
            <Box component="p" className="entry-product-note">
                Designed to move with you.
            </Box>
        </Surface>
    );
}

function ProductBadge({children, className}: {children: ReactNode; className: string}) {
    return (
        <Box className={className}>
            <span aria-hidden="true"/>
            {children}
        </Box>
    );
}

function ProductVisual() {
    return (
        <Box className="entry-product-visual" aria-hidden="true">
            <Box className="entry-product-ring"/>
            <Box className="entry-product-shine"/>
        </Box>
    );
}

const benefits = [
    {label: 'Secure by design', icon: VerifiedUserOutlinedIcon},
    {label: 'Instant contactless sharing', icon: TouchAppOutlinedIcon},
    {label: 'Always under your control', icon: DiamondOutlinedIcon},
];

function EntryBenefits() {
    return (
        <Box component="footer" className="entry-benefits" aria-label="FlexPayz benefits">
            {benefits.map(({label, icon: Icon}) => (
                <Box className="entry-benefit" key={label}>
                    <span className="entry-benefit-icon" aria-hidden="true">
                        <Icon fontSize="small"/>
                    </span>
                    <span>{label}</span>
                </Box>
            ))}
        </Box>
    );
}
