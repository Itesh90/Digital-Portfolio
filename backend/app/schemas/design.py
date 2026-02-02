"""
Design System Schemas

Locked design primitives that AI selects from but cannot create.
"""

from typing import Dict, List, Literal

from pydantic import BaseModel, Field


# =============================================================================
# DESIGN PRIMITIVES (LOCKED)
# =============================================================================

DESIGN_PRIMITIVES = {
    "layouts": ["single-column", "sidebar-left", "sidebar-right", "grid"],
    
    "font_sets": {
        "modern-sans": {
            "heading": "Inter",
            "body": "Inter",
            "weights": {"heading": 700, "body": 400}
        },
        "classic-serif": {
            "heading": "Playfair Display",
            "body": "Source Serif Pro",
            "weights": {"heading": 700, "body": 400}
        },
        "technical": {
            "heading": "JetBrains Mono",
            "body": "IBM Plex Sans",
            "weights": {"heading": 600, "body": 400}
        },
        "creative": {
            "heading": "Outfit",
            "body": "DM Sans",
            "weights": {"heading": 700, "body": 400}
        }
    },
    
    "palettes": {
        "neutral-accent": {
            "primary": "#1a1a2e",
            "secondary": "#16213e",
            "accent": "#4361ee",
            "background": "#ffffff",
            "surface": "#f8f9fa",
            "text": "#1a1a2e",
            "text_secondary": "#6c757d"
        },
        "dark-mode": {
            "primary": "#ffffff",
            "secondary": "#e0e0e0",
            "accent": "#7c3aed",
            "background": "#0f0f23",
            "surface": "#1a1a2e",
            "text": "#ffffff",
            "text_secondary": "#a0a0a0"
        },
        "warm-minimal": {
            "primary": "#2d2d2d",
            "secondary": "#4a4a4a",
            "accent": "#e07a5f",
            "background": "#f5f0eb",
            "surface": "#ffffff",
            "text": "#2d2d2d",
            "text_secondary": "#6b6b6b"
        },
        "tech-blue": {
            "primary": "#0a192f",
            "secondary": "#112240",
            "accent": "#64ffda",
            "background": "#ffffff",
            "surface": "#f0f4f8",
            "text": "#0a192f",
            "text_secondary": "#495670"
        },
        "ocean-breeze": {
            "primary": "#1e3a5f",
            "secondary": "#2d5a87",
            "accent": "#00bcd4",
            "background": "#f5f9fc",
            "surface": "#ffffff",
            "text": "#1e3a5f",
            "text_secondary": "#5a7a9a"
        },
        "forest-green": {
            "primary": "#1b4332",
            "secondary": "#2d6a4f",
            "accent": "#40916c",
            "background": "#f8faf9",
            "surface": "#ffffff",
            "text": "#1b4332",
            "text_secondary": "#52796f"
        }
    },
    
    "spacing": {
        "compact": {
            "section_gap": "2rem",
            "element_gap": "1rem",
            "padding": "1rem"
        },
        "comfortable": {
            "section_gap": "4rem",
            "element_gap": "1.5rem",
            "padding": "2rem"
        },
        "spacious": {
            "section_gap": "6rem",
            "element_gap": "2rem",
            "padding": "3rem"
        }
    },
    
    "border_radius": {
        "none": "0",
        "subtle": "0.25rem",
        "rounded": "0.5rem",
        "pill": "9999px"
    },
    
    "shadows": {
        "none": "none",
        "subtle": "0 1px 3px rgba(0,0,0,0.12)",
        "medium": "0 4px 6px rgba(0,0,0,0.1)",
        "strong": "0 10px 25px rgba(0,0,0,0.15)"
    }
}


# =============================================================================
# DESIGN CONFIG SCHEMA
# =============================================================================

class DesignConfig(BaseModel):
    """
    Portfolio design configuration.
    
    AI selects from predefined primitives only.
    No custom values allowed.
    """
    
    layout: Literal["single-column", "sidebar-left", "sidebar-right", "grid"] = Field(
        default="single-column",
        description="Page layout structure"
    )
    
    font_set: Literal["modern-sans", "classic-serif", "technical", "creative"] = Field(
        default="modern-sans",
        description="Typography pairing"
    )
    
    palette: Literal[
        "neutral-accent", "dark-mode", "warm-minimal", 
        "tech-blue", "ocean-breeze", "forest-green"
    ] = Field(
        default="neutral-accent",
        description="Color palette"
    )
    
    spacing: Literal["compact", "comfortable", "spacious"] = Field(
        default="comfortable",
        description="Spacing scale"
    )
    
    border_radius: Literal["none", "subtle", "rounded", "pill"] = Field(
        default="rounded",
        description="Corner rounding style"
    )
    
    shadows: Literal["none", "subtle", "medium", "strong"] = Field(
        default="subtle",
        description="Shadow intensity"
    )
    
    def get_css_variables(self) -> Dict[str, str]:
        """Generate CSS custom properties from config."""
        palette = DESIGN_PRIMITIVES["palettes"][self.palette]
        fonts = DESIGN_PRIMITIVES["font_sets"][self.font_set]
        spacing = DESIGN_PRIMITIVES["spacing"][self.spacing]
        
        return {
            "--color-primary": palette["primary"],
            "--color-secondary": palette["secondary"],
            "--color-accent": palette["accent"],
            "--color-background": palette["background"],
            "--color-surface": palette["surface"],
            "--color-text": palette["text"],
            "--color-text-secondary": palette["text_secondary"],
            "--font-heading": fonts["heading"],
            "--font-body": fonts["body"],
            "--font-weight-heading": str(fonts["weights"]["heading"]),
            "--font-weight-body": str(fonts["weights"]["body"]),
            "--spacing-section": spacing["section_gap"],
            "--spacing-element": spacing["element_gap"],
            "--spacing-padding": spacing["padding"],
            "--border-radius": DESIGN_PRIMITIVES["border_radius"][self.border_radius],
            "--shadow": DESIGN_PRIMITIVES["shadows"][self.shadows],
        }


class DesignSelectionRequest(BaseModel):
    """Request for AI to select design primitives."""
    
    role: str = Field(..., description="User's primary role")
    seniority: str = Field(..., description="Career level")
    purpose: str = Field(..., description="Portfolio purpose")


class DesignSelectionResponse(BaseModel):
    """AI-selected design configuration."""
    
    config: DesignConfig
    reasoning: str = Field(..., description="Brief explanation of design choices")


class DesignIntent(BaseModel):
    """User-provided design preferences from Onboarding."""
    density: Literal["compact", "balanced", "spacious"]
    personality: Literal["minimal", "professional", "bold"]
    color_preference: Literal["neutral", "accent", "dark"]

    def map_to_config(self) -> DesignConfig:
        """Deterministically map intent to design primitives."""
        
        # 1. Spacing (Direct Map)
        # compact -> compact, balanced -> comfortable, spacious -> spacious
        spacing_map = {
            "compact": "compact",
            "balanced": "comfortable",
            "spacious": "spacious"
        }
        
        # 2. Font Set (Personality Map)
        font_map = {
            "minimal": "modern-sans",
            "professional": "classic-serif",
            "bold": "creative"
        }
        
        # 3. Palette (Color Preference Map)
        palette_map = {
            "neutral": "warm-minimal",
            "accent": "tech-blue",
            "dark": "dark-mode"
        }
        
        # 4. Secondary derivations
        border_radius = "rounded"
        if self.personality == "minimal":
            border_radius = "subtle"
        elif self.personality == "bold":
            border_radius = "pill"
            
        shadows = "subtle"
        if self.density == "spacious":
            shadows = "medium"
        elif self.personality == "minimal":
            shadows = "none"

        return DesignConfig(
            layout="single-column", # Always start safe
            font_set=font_map.get(self.personality, "modern-sans"),
            palette=palette_map.get(self.color_preference, "neutral-accent"),
            spacing=spacing_map.get(self.density, "comfortable"),
            border_radius=border_radius,
            shadows=shadows
        )
