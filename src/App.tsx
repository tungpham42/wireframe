import React, { useState, useEffect, useRef } from "react";
import { Layout, Button, Space, Typography } from "antd";
import {
  BorderOutlined,
  FontColorsOutlined,
  PictureOutlined,
  DownloadOutlined,
  LayoutOutlined,
  MinusOutlined,
  PlaySquareOutlined,
  AlignLeftOutlined,
} from "@ant-design/icons";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type ElementType =
  | "button"
  | "text"
  | "dummyText"
  | "image"
  | "rectangle"
  | "browser"
  | "line"
  | "video";

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
}

const App: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Updated to track both the element ID and the timestamp for precise double-taps
  const lastTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });

  const addElement = (type: ElementType) => {
    const offset = (elements.length % 5) * 20;
    const newElement: CanvasElement = {
      id: uuidv4(),
      type,
      x: 50 + offset,
      y: 50 + offset,
      width:
        type === "browser"
          ? 500
          : type === "dummyText"
            ? 250
            : type === "video"
              ? 320
              : type === "line"
                ? 200
                : 120,
      height:
        type === "browser"
          ? 350
          : type === "dummyText"
            ? 100
            : type === "video"
              ? 180
              : type === "line"
                ? 4
                : 50,
      content:
        type === "button"
          ? "Click Me"
          : type === "text"
            ? "Double tap to edit"
            : type === "rectangle"
              ? "Container"
              : type === "browser"
                ? "https://awesome-app.com"
                : undefined,
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, newProps: Partial<CanvasElement>) => {
    setElements(
      elements.map((el) => (el.id === id ? { ...el, ...newProps } : el)),
    );
  };

  const exportCanvasToImage = async () => {
    if (!canvasRef.current) return;
    setSelectedId(null);
    setEditingId(null);

    // Wait for state updates to flush to DOM so selection boxes disappear
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(canvasRef.current!, {
          backgroundColor: "#eef2ff",
          useCORS: true,
          scale: window.devicePixelRatio || 2, // Better crispness on mobile retina displays
          scrollX: 0, // Reset scroll offsets to prevent mobile offset bugs
          scrollY: 0,
        });

        // Convert to Blob instead of Data URL to prevent mobile browser crashes
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.error("Canvas to Blob failed");
            return;
          }

          const fileName = `wireframe-${Date.now()}.png`;
          const file = new File([blob], fileName, { type: "image/png" });

          // 1. Try Native Mobile Web Share API (Best for iOS/Android)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: "Wireframe Export",
              });
              return; // Exit if shared successfully
            } catch (shareError) {
              console.log("Sharing failed or was cancelled", shareError);
              // If share fails or user cancels, fall through to traditional download
            }
          }

          // 2. Traditional download fallback (Desktop & older mobile browsers)
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;

          // Must append to body for programmatic click to work on iOS Safari/Firefox
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up memory
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        }, "image/png");
      } catch (err) {
        console.error("Export failed:", err);
      }
    }, 150);
  };

  const renderElementContent = (el: CanvasElement) => {
    const isEditing = editingId === el.id;

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      updateElement(el.id, { content: e.target.value });
    };

    const handleBlur = () => setEditingId(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setEditingId(null);
      }
    };

    const commonProps = {
      onDoubleClick: () => setEditingId(el.id),
      onTouchEnd: (e: React.TouchEvent) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        // Check if the double tap happened on the exact same element within the time limit
        if (
          lastTapRef.current.id === el.id &&
          now - lastTapRef.current.time < DOUBLE_TAP_DELAY
        ) {
          setEditingId(el.id);
          if (e.cancelable) e.preventDefault();
        }

        // Save the current interaction
        lastTapRef.current = { id: el.id, time: now };
      },
    };

    if (isEditing) {
      if (el.type === "dummyText") {
        return (
          <textarea
            autoFocus
            value={el.content || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            style={{
              width: "100%",
              height: "100%",
              border: "2px dashed #111",
              borderRadius: "4px",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "14px",
              padding: "8px",
              resize: "none",
              backgroundColor: "#fff9c4",
            }}
          />
        );
      }

      return (
        <input
          autoFocus
          value={el.content || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            height: "100%",
            border: "2px dashed #111",
            borderRadius: "4px",
            outline: "none",
            fontFamily: "inherit",
            fontSize: "16px",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: "#fff9c4",
          }}
        />
      );
    }

    switch (el.type) {
      case "button":
        return (
          <button className="wireframe-btn" {...commonProps}>
            {el.content}
          </button>
        );
      case "text":
        return (
          <div className="wireframe-text" {...commonProps}>
            {el.content}
          </div>
        );
      case "dummyText":
        return (
          <div className="wireframe-dummy-text" {...commonProps}>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
        );
      case "rectangle":
        return <div className="wireframe-rect" {...commonProps}></div>;
      case "image":
        return (
          <div className="wireframe-image">
            <PictureOutlined style={{ fontSize: "36px", color: "#94a3b8" }} />
          </div>
        );
      case "browser":
        return (
          <div className="wireframe-browser" {...commonProps}>
            <div className="browser-header">
              <div className="browser-actions">
                <div className="circle"></div>
                <div className="circle"></div>
                <div className="circle"></div>
              </div>
              <div className="browser-url-bar">{el.content}</div>
            </div>
            <div className="browser-content-area"></div>
          </div>
        );
      case "line":
        return <div className="wireframe-line" {...commonProps}></div>;
      case "video":
        return (
          <div className="wireframe-video" {...commonProps}>
            <PlaySquareOutlined
              style={{ fontSize: "48px", color: "#475569" }}
            />
            <div className="video-duration">00:42</div>
          </div>
        );
      default:
        return null;
    }
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
    setSelectedId(null);
  };

  const bringToFront = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    setElements([...elements.filter((e) => e.id !== id), el]);
  };

  const sendToBack = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    setElements([el, ...elements.filter((e) => e.id !== id)]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !editingId
      ) {
        setElements((prevElements) =>
          prevElements.filter((el) => el.id !== selectedId),
        );
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedId, editingId]);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Title level={3} className="header-title">
          Wireframe Builder
        </Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={exportCanvasToImage}
          className="export-btn"
        >
          Export
        </Button>
      </Header>

      <Layout>
        <Sider
          width={200}
          className="app-sidebar"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <Space orientation="vertical" style={{ width: "100%" }} size="small">
            <Button
              block
              icon={<LayoutOutlined />}
              onClick={() => addElement("browser")}
            >
              Browser
            </Button>
            <Button
              block
              icon={<BorderOutlined />}
              onClick={() => addElement("button")}
            >
              Button
            </Button>
            <Button
              block
              icon={<FontColorsOutlined />}
              onClick={() => addElement("text")}
            >
              Text Block
            </Button>
            <Button
              block
              icon={<AlignLeftOutlined />}
              onClick={() => addElement("dummyText")}
            >
              Dummy Text
            </Button>
            <Button
              block
              icon={<BorderOutlined />}
              onClick={() => addElement("rectangle")}
            >
              Container
            </Button>
            <Button
              block
              icon={<PictureOutlined />}
              onClick={() => addElement("image")}
            >
              Image Box
            </Button>
            <Button
              block
              icon={<MinusOutlined />}
              onClick={() => addElement("line")}
            >
              Line / Divider
            </Button>
            <Button
              block
              icon={<PlaySquareOutlined />}
              onClick={() => addElement("video")}
            >
              Video Player
            </Button>
          </Space>
        </Sider>

        <Content className="app-content">
          <div className="export-wrapper" ref={canvasRef}>
            <div className="canvas-wrapper">
              <div
                className="wireframe-canvas"
                onPointerDown={() => setSelectedId(null)} // Changed to onPointerDown
              >
                {elements.map((el) => (
                  <Rnd
                    key={el.id}
                    bounds="parent"
                    className={`rnd-element ${selectedId === el.id ? "selected" : ""}`}
                    size={{ width: el.width, height: el.height }}
                    position={{ x: el.x, y: el.y }}
                    onPointerDown={(e: React.PointerEvent) => {
                      // Changed to onPointerDown
                      e.stopPropagation();
                      setSelectedId(el.id);
                    }}
                    onDragStop={(e, d) =>
                      updateElement(el.id, { x: d.x, y: d.y })
                    }
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateElement(el.id, {
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        ...position,
                      });
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      {selectedId === el.id && (
                        <div className="layer-controls">
                          <button
                            className="layer-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              bringToFront(el.id);
                            }}
                            onPointerDown={(e: React.PointerEvent) => {
                              e.stopPropagation();
                              bringToFront(el.id);
                            }}
                            title="Bring Forward"
                          >
                            ⬆
                          </button>
                          <button
                            className="layer-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendToBack(el.id);
                            }}
                            onPointerDown={(e: React.PointerEvent) => {
                              e.stopPropagation();
                              sendToBack(el.id);
                            }}
                            title="Send Backward"
                          >
                            ⬇
                          </button>
                          <button
                            className="layer-btn delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                            onPointerDown={(e: React.PointerEvent) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                            title="Delete"
                          >
                            ✖
                          </button>
                        </div>
                      )}
                      {renderElementContent(el)}
                    </div>
                  </Rnd>
                ))}
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
