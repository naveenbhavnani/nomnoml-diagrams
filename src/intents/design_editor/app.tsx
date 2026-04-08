import { useFeatureSupport } from "@canva/app-hooks";
import {
  Box,
  Button,
  FormField,
  Link,
  MultilineInput,
  Rows,
  Title,
} from "@canva/app-ui-kit";
import { upload } from "@canva/asset";
import { addElementAtCursor, addElementAtPoint } from "@canva/design";
import { requestOpenExternalUrl } from "@canva/platform";
import nomnoml from "nomnoml";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import * as styles from "styles/components.css";

/**
 * Normalize nomnoml code to handle common formatting issues:
 * - Trim leading/trailing whitespace from directive lines (lines starting with #)
 * - Remove leading whitespace that would break directive parsing
 */
function normalizeNomnomlCode(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      // If line is a directive (starts with #), use trimmed version
      if (trimmed.startsWith("#")) {
        return trimmed;
      }
      return line;
    })
    .join("\n");
}

const DEFAULT_CODE = `[User|
  name: string
  email: string
  |
  login()
  logout()
]

[User] -> [Session]
[Session] -> [Database]`;

export const App = () => {
  const intl = useIntl();
  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) =>
    isSupported(fn),
  );

  const [code, setCode] = useState(DEFAULT_CODE);
  const [svgOutput, setSvgOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Normalize code to handle common formatting issues
  const normalizedCode = useMemo(() => normalizeNomnomlCode(code), [code]);

  // Render SVG whenever code changes
  useEffect(() => {
    try {
      const svg = nomnoml.renderSvg(normalizedCode);
      setSvgOutput(svg);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render diagram");
      setSvgOutput("");
    }
  }, [normalizedCode]);

  const handleAddToDesign = useCallback(async () => {
    if (!addElement || !svgOutput) {
      return;
    }

    setIsLoading(true);

    try {
      // Convert SVG to base64 data URL
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgOutput)))}`;

      // Upload to Canva
      const asset = await upload({
        type: "image",
        url: svgDataUrl,
        mimeType: "image/svg+xml",
        thumbnailUrl: svgDataUrl,
        aiDisclosure: "none",
      });

      // Add to canvas
      await addElement({
        type: "image",
        ref: asset.ref,
        altText: {
          text: intl.formatMessage({
            defaultMessage: "Nomnoml Diagram",
            description: "Alt text for the diagram image added to the canvas",
          }),
          decorative: false,
        },
      });

      await asset.whenUploaded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add diagram to design",
      );
    } finally {
      setIsLoading(false);
    }
  }, [addElement, svgOutput, intl]);

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <FormField
          label={intl.formatMessage({
            defaultMessage: "Diagram code",
            description: "Label for the code input section",
          })}
          error={error || undefined}
          control={(props) => (
            <MultilineInput
              {...props}
              value={code}
              onChange={setCode}
              placeholder={intl.formatMessage({
                defaultMessage: "Enter nomnoml syntax...",
                description: "Placeholder text for the diagram code input",
              })}
              minRows={8}
              maxRows={12}
              autoGrow
            />
          )}
        />

        <Link
          href="https://nomnoml.com"
          requestOpenExternalUrl={() =>
            requestOpenExternalUrl({ url: "https://nomnoml.com" })
          }
        >
          {intl.formatMessage({
            defaultMessage: "Nomnoml syntax reference",
            description: "Link to the nomnoml syntax reference website",
          })}
        </Link>

        <Title size="small">
          {intl.formatMessage({
            defaultMessage: "Preview",
            description: "Title for the diagram preview section",
          })}
        </Title>

        <Box
          border="standard"
          borderRadius="standard"
          padding="1u"
          background="neutralLow"
        >
          <div
            className={styles.diagramPreview}
            dangerouslySetInnerHTML={{ __html: svgOutput }}
          />
        </Box>

        <Button
          variant="primary"
          onClick={handleAddToDesign}
          disabled={!addElement || !svgOutput || !!error}
          loading={isLoading}
          stretch
          tooltipLabel={
            !addElement
              ? intl.formatMessage({
                  defaultMessage:
                    "This feature is not supported in the current page",
                  description:
                    "Tooltip when adding elements is not supported",
                })
              : undefined
          }
        >
          {intl.formatMessage({
            defaultMessage: "Add to design",
            description: "Button text to add the diagram to the Canva design",
          })}
        </Button>
      </Rows>
    </div>
  );
};
