import { Fragment, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

const PAGE_SIZE = 1;
const FIELD_INDUSTRY = "業界";
const FIELD_CASE = "事例名";
const FIELD_DESCRIPTION = "その説明";
const FIELD_GLOSSARY = "専門用語の解説";
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = ".,!?;:)]}。、，．！？；：）」』】》〉";

function splitTrailingPunctuation(rawUrl) {
  let url = rawUrl;
  let suffix = "";

  while (url.length > 0) {
    const lastChar = url[url.length - 1];
    if (!TRAILING_PUNCTUATION.includes(lastChar)) {
      break;
    }
    suffix = lastChar + suffix;
    url = url.slice(0, -1);
  }

  return { url, suffix };
}

function renderTextWithLinks(text) {
  if (!text) {
    return "";
  }

  const parts = String(text).split(URL_PATTERN);
  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return <Fragment key={`text-${index}`}>{part}</Fragment>;
    }

    const { url, suffix } = splitTrailingPunctuation(part);
    if (!url) {
      return <Fragment key={`url-${index}`}>{part}</Fragment>;
    }

    const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;

    return (
      <Fragment key={`url-${index}`}>
        <a
          className="inline-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {url}
        </a>
        {suffix}
      </Fragment>
    );
  });
}

function downloadTextFile(text, fileName) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function nowStamp() {
  const date = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export default function App() {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [csvTextInput, setCsvTextInput] = useState("");
  const [sourceName, setSourceName] = useState("export");
  const [likedRows, setLikedRows] = useState({});
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [reachedLastRow, setReachedLastRow] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  }, [rows.length]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [page, rows]);

  const canExport = useMemo(() => {
    return rows.length > 0 && reachedLastRow;
  }, [rows.length, reachedLastRow]);

  const likedRowIndexes = useMemo(() => {
    return Object.keys(likedRows)
      .filter((rowIndex) => likedRows[rowIndex])
      .map((rowIndex) => Number(rowIndex))
      .sort((a, b) => a - b);
  }, [likedRows]);

  const getFieldValue = (row, preferredHeader, fallbackIndex) => {
    if (row[preferredHeader] !== undefined) {
      return row[preferredHeader] ?? "";
    }
    const fallbackHeader = headers[fallbackIndex];
    return fallbackHeader ? (row[fallbackHeader] ?? "") : "";
  };

  useEffect(() => {
    if (rows.length > 0 && page === totalPages) {
      setReachedLastRow(true);
    }
  }, [page, rows.length, totalPages]);

  const applyParsedData = (result, nextSourceName) => {
    if (result.errors.length > 0) {
      setError(`CSV解析エラー: ${result.errors[0].message}`);
      return;
    }

    const parsedHeaders = result.meta.fields || [];
    const parsedRows = result.data || [];
    if (parsedHeaders.length === 0 || parsedRows.length === 0) {
      setError("CSVのヘッダーまたはデータ行を確認してください。");
      return;
    }

    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setSourceName(nextSourceName || "export");
    setLikedRows({});
    setComments({});
    setCommentInput({});
    setReachedLastRow(false);
    setPage(1);
    setError("");
  };

  const onUpload = (file) => {
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (result) => {
        const nextSourceName = file.name.replace(/\.csv$/i, "") || "export";
        applyParsedData(result, nextSourceName);
      },
    });
  };

  const onLoadCsvText = () => {
    const raw = csvTextInput.trim();
    if (!raw) {
      setError("平文CSVを入力してください。");
      return;
    }

    Papa.parse(raw, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        applyParsedData(result, "pasted_csv");
      },
    });
  };

  const toggleLike = (rowIndex) => {
    setLikedRows((prev) => {
      const next = { ...prev };
      if (next[rowIndex]) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = true;
      }
      return next;
    });
  };

  const updateCommentInput = (rowIndex, value) => {
    setCommentInput((prev) => ({ ...prev, [rowIndex]: value }));
  };

  const addComment = (rowIndex) => {
    const value = (commentInput[rowIndex] || "").trim();
    if (!value) {
      return;
    }

    setComments((prev) => {
      const next = { ...prev };
      const old = next[rowIndex] || [];
      next[rowIndex] = [...old, value];
      return next;
    });

    setCommentInput((prev) => ({ ...prev, [rowIndex]: "" }));
  };

  const removeComment = (rowIndex, commentIndex) => {
    setComments((prev) => {
      const old = prev[rowIndex] || [];
      const nextArray = old.filter((_, idx) => idx !== commentIndex);
      const next = { ...prev };
      if (nextArray.length === 0) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = nextArray;
      }
      return next;
    });
  };

  const exportCsv = () => {
    if (!canExport) {
      return;
    }

    const exportRows = likedRowIndexes.map((rowIndex) => {
      const original = rows[rowIndex];
      const persistedComments = comments[rowIndex] || [];
      const pendingComment = (commentInput[rowIndex] || "").trim();
      const rowComments = [
        ...persistedComments,
        ...(pendingComment ? [pendingComment] : []),
      ]
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      return {
        ...original,
        liked: true,
        comments: rowComments.length > 0 ? JSON.stringify(rowComments) : "",
      };
    });

    const csv = Papa.unparse(exportRows, {
      columns: [...headers, "liked", "comments"],
    });

    downloadTextFile(csv, `${sourceName}_liked_rows_${nowStamp()}.csv`);
  };

  const hasData = rows.length > 0;

  return (
    <main className="app">
      <section className="hero">
        <h1>Vocabulary Card Review</h1>
        <p>
          1カードずつ確認し、気になった事例にハートとコメントを残してCSV出力します。
        </p>
      </section>

      <section className="panel">
        <label className="file-label" htmlFor="fileInput">
          CSVファイルを選択
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUpload(file);
            }
          }}
        />

        <div className="csv-text-box">
          <label className="file-label" htmlFor="csvTextInput">
            CSV平文を貼り付け
          </label>
          <textarea
            id="csvTextInput"
            value={csvTextInput}
            onChange={(event) => setCsvTextInput(event.target.value)}
            placeholder="例: 1行目にヘッダーを含むCSVをそのまま貼り付け"
            rows={6}
          />
          <button type="button" onClick={onLoadCsvText}>
            平文CSVを読み込む
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </section>

      {hasData && (
        <section className="panel status-grid">
          <div>
            <strong>行数</strong>
            <p>{rows.length}</p>
          </div>
          <div>
            <strong>最終行到達</strong>
            <p>{reachedLastRow ? "到達済み" : "未到達"}</p>
          </div>
          <div>
            <strong>いいね対象行</strong>
            <p>{likedRowIndexes.length}</p>
          </div>
          <div>
            <button type="button" disabled={!canExport} onClick={exportCsv}>
              抽出CSVをダウンロード
            </button>
          </div>
        </section>
      )}

      {hasData && (
        <section className="list">
          {pagedRows.map((row, offset) => {
            const rowIndex = (page - 1) * PAGE_SIZE + offset;
            const liked = Boolean(likedRows[rowIndex]);
            const rowComments = comments[rowIndex] || [];
            const industry = getFieldValue(row, FIELD_INDUSTRY, 0);
            const caseName = getFieldValue(row, FIELD_CASE, 1);
            const description = getFieldValue(row, FIELD_DESCRIPTION, 2);
            const glossary = getFieldValue(row, FIELD_GLOSSARY, 3);

            return (
              <article key={rowIndex} className="card">
                <header className="card-head">
                  <h2>Card {rowIndex + 1}</h2>
                </header>

                <div className="meta">
                  <p>{industry}</p>
                  <p>{caseName}</p>
                </div>

                <p className="description">
                  {renderTextWithLinks(description)}
                </p>
                <p className="glossary">{renderTextWithLinks(glossary)}</p>

                <div className="comment-box card-comment-box">
                  <div className="comment-input-row">
                    <input
                      type="text"
                      value={commentInput[rowIndex] || ""}
                      onChange={(e) =>
                        updateCommentInput(rowIndex, e.target.value)
                      }
                      placeholder="このカードへのコメントを追加"
                    />
                    <button type="button" onClick={() => addComment(rowIndex)}>
                      追加
                    </button>
                  </div>

                  {rowComments.length > 0 && (
                    <ul>
                      {rowComments.map((comment, idx) => (
                        <li key={idx}>
                          <span>{comment}</span>
                          <button
                            type="button"
                            onClick={() => removeComment(rowIndex, idx)}
                          >
                            削除
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="card-actions">
                    <button
                      type="button"
                      className={
                        liked
                          ? "toggle-btn heart-toggle active"
                          : "toggle-btn heart-toggle"
                      }
                      onClick={() => toggleLike(rowIndex)}
                      aria-label={liked ? "いいねを取り消す" : "カードにいいね"}
                    >
                      <span aria-hidden="true">
                        {liked
                          ? String.fromCharCode(9829)
                          : String.fromCharCode(9825)}
                      </span>
                      <span>{liked ? "いいね ON" : "いいね OFF"}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {hasData && (
        <section className="panel pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            前へ
          </button>
          <p>
            {page} / {totalPages}
          </p>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            次へ
          </button>
        </section>
      )}
    </main>
  );
}
